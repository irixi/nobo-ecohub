"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoboHub = void 0;
const node_net_1 = __importDefault(require("node:net"));
const constants_js_1 = require("./proto/constants.js");
const frames_js_1 = require("./transport/frames.js");
const discovery_js_1 = require("./transport/discovery.js");
const parser_js_1 = require("./proto/parser.js");
const valueObjects_js_1 = require("./model/valueObjects.js");
const validation_js_1 = require("./proto/validation.js");
const node_events_1 = require("node:events");
class NoboHub extends node_events_1.EventEmitter {
    constructor(serial, ip, useDiscovery = true) {
        super();
        this.serial = serial;
        this.ip = ip;
        this.useDiscovery = useDiscovery;
        this.zones = new Map();
        this.comps = new Map();
        this.weeks = new Map();
        this.overrides = new Map();
        this.temps = new Map();
        this.lastRx = Date.now();
    }
    // ───────────────────────── connect ─────────────────────────
    async connect() {
        const hubs = this.useDiscovery ? await (0, discovery_js_1.discoverHubs)() : [[this.ip, this.serial]];
        for (const [ip, sn] of hubs)
            try {
                if (await this.connectTcp(ip, sn))
                    return;
            }
            catch { }
        throw new Error("Unable to connect to any hub");
    }
    async connectTcp(ip, serial) {
        this.sock = node_net_1.default.createConnection({ host: ip, port: 27779 });
        await once(this.sock, "connect");
        this.sock.setKeepAlive(true, 20000);
        await this.send(["HELLO" /* Cmd.START */, constants_js_1.PROTOCOL_VERSION, serial, this.ts14()]);
        const ok = await this.recvRaw();
        if (ok[0] !== "HELLO" /* Cmd.START */)
            throw new Error("bad hello");
        await this.send(["HANDSHAKE" /* Cmd.HANDSHAKE */]);
        const hs = await this.recvRaw();
        if (hs[0] !== "HANDSHAKE" /* Cmd.HANDSHAKE */)
            throw new Error("handshake failed");
        this.pump(); // start frame pump
        await this.send(["G00" /* Cmd.GET_ALL_INFO */]);
        await once(this, "ready");
        return true;
    }
    // ─────────────────── internal helpers ───────────────────
    async send(words) { if (this.sock)
        await new Promise((res, rej) => this.sock.write(words.join(" ") + "\r", e => e ? rej(e) : res())); }
    ts14(d = new Date()) { return d.toISOString().replace(/[^0-9]/g, "").slice(0, 14); }
    // single‑use receiver during handshake – strips trailing CR or CRLF
    recvRaw() {
        return new Promise(resolve => {
            this.sock.once("data", buf => {
                const line = buf.toString("utf8").replace(/\r?\n?$/, "");
                resolve(line.split(" "));
            });
        });
    }
    async pump() {
        if (!this.sock)
            return;
        // heartbeat – fire‑and‑forget
        const hb = setInterval(() => this.send(["HANDSHAKE" /* Cmd.HANDSHAKE */]).catch(() => { }), 14000);
        for await (const parts of (0, frames_js_1.frames)(this.sock)) {
            this.lastRx = Date.now();
            this.dispatch((0, parser_js_1.parse)(parts));
        }
        clearInterval(hb);
    }
    dispatch(msg) {
        switch (msg.t) {
            case "H00" /* Resp.SENDING_ALL_INFO */:
                this.zones.clear();
                this.comps.clear();
                this.weeks.clear();
                this.overrides.clear();
                this.temps.clear();
                break;
            case "H01" /* Resp.ZONE_INFO */:
            case "B00" /* Resp.ADD_ZONE */:
            case "V00" /* Resp.UPDATE_ZONE */:
                this.zones.set(msg.zone.zoneId, new valueObjects_js_1.ZoneVO(msg.zone));
                break;
            case "H02" /* Resp.COMPONENT_INFO */:
            case "B01" /* Resp.ADD_COMPONENT */:
            case "V01" /* Resp.UPDATE_COMPONENT */:
                this.comps.set(msg.component.serial, new valueObjects_js_1.ComponentVO(msg.component));
                break;
            case "H03" /* Resp.WEEK_PROFILE_INFO */:
            case "B02" /* Resp.ADD_WEEK_PROFILE */:
            case "V02" /* Resp.UPDATE_WEEK_PROFILE */:
                this.weeks.set(msg.profile.weekProfileId, new valueObjects_js_1.WeekProfileVO(msg.profile));
                break;
            case "H04" /* Resp.OVERRIDE_INFO */:
            case "B03" /* Resp.ADD_OVERRIDE */:
                this.overrides.set(msg.override.overrideId, new valueObjects_js_1.OverrideVO(msg.override));
                break;
            case "H05" /* Resp.HUB_INFO */:
            case "V03" /* Resp.UPDATE_HUB_INFO */:
                this.hubInfo = msg.hub;
                if (msg.t === "H05" /* Resp.HUB_INFO */)
                    this.emit("ready");
                break;
            case "V06" /* Resp.UPDATE_INTERNET_ACCESS */:
                this.emit("internet", { enabled: msg.access === "1", key: msg.key });
                break;
            case "S00" /* Resp.REMOVE_ZONE */:
                this.zones.delete(msg.zoneId);
                break;
            case "S01" /* Resp.REMOVE_COMPONENT */:
                this.comps.delete(msg.serial);
                break;
            case "S02" /* Resp.REMOVE_WEEK_PROFILE */:
                this.weeks.delete(msg.weekProfileId);
                break;
            case "S03" /* Resp.REMOVE_OVERRIDE */:
                this.overrides.delete(msg.overrideId);
                break;
            case "Y02" /* Resp.COMPONENT_TEMP */:
                this.temps.set(msg.serial, msg.temperature);
                break;
            case "E00" /* Resp.ERROR */:
                this.emit("error", new Error(`Hub error ${msg.code}: ${msg.message}`));
                break;
        }
        this.emit("update", msg);
    }
    // ─────────────────────── public API ───────────────────────
    async setZoneTemperatures(id, comfort, eco) {
        const z = this.zones.get(id);
        if (!z)
            throw new Error("unknown zone");
        (0, validation_js_1.assertTemperature)(comfort);
        (0, validation_js_1.assertTemperature)(eco);
        if (comfort < eco)
            throw new Error("comfort<eco");
        await this.send(["U00" /* Cmd.UPDATE_ZONE */, id, z.name, z.weekProfileId, comfort.toString(), eco.toString(), z.allowsOverride ? constants_js_1.Override.Allowed.YES : constants_js_1.Override.Allowed.NO, "-1"]);
    }
    async createOverride(opts) {
        const { mode, type, targetType } = opts;
        const start = opts.startTime ?? "-1";
        const end = opts.endTime ?? "-1";
        const tgt = opts.targetId ?? "-1";
        if (start !== "-1" && (!(0, validation_js_1.isValidDatetime)(start) || !(0, validation_js_1.quarterMinutes)(start.slice(-2))))
            throw new Error("bad start");
        if (end !== "-1" && (!(0, validation_js_1.isValidDatetime)(end) || !(0, validation_js_1.quarterMinutes)(end.slice(-2))))
            throw new Error("bad end");
        await this.send(["A03" /* Cmd.ADD_OVERRIDE */, "1", constants_js_1.Override.Mode[mode], constants_js_1.Override.Type[type], end, start, constants_js_1.Override.Target[targetType], tgt]);
    }
    getZoneMode(id, when = new Date()) {
        const z = this.zones.get(id);
        if (!z)
            throw new Error("bad zone");
        // override precedence
        for (const ov of this.overrides.values()) {
            if (ov.d.mode === constants_js_1.Override.Mode.NORMAL)
                continue;
            if (ov.d.targetType === constants_js_1.Override.Target.ZONE && ov.d.targetId === id)
                return mapMode(ov.d.mode);
            if (ov.d.targetType === constants_js_1.Override.Target.GLOBAL && z.allowsOverride)
                return mapMode(ov.d.mode);
        }
        return this.weeks.get(z.weekProfileId)?.statusAt(when) ?? "normal";
    }
    getCurrentTemperature(id) {
        for (const c of this.comps.values())
            if (c.d.zoneId === id) {
                const t = this.temps.get(c.d.serial);
                if (t && t !== "N/A")
                    return t;
            }
        return null;
    }
}
exports.NoboHub = NoboHub;
function mapMode(m) {
    return m === "1" ? "comfort" : m === "2" ? "eco" : "away";
}
function once(emitter, ev) { return new Promise(res => emitter.once(ev, res)); }
