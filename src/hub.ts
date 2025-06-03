import net from "node:net";
import { Cmd, Resp, Override, PROTOCOL_VERSION } from "./proto/constants.js";
import { frames } from "./transport/frames.js";
import { discoverHubs } from "./transport/discovery.js";
import { parse, ResponseMessage } from "./proto/parser.js";
import { ZoneVO, ComponentVO, WeekProfileVO, OverrideVO } from "./model/valueObjects.js";
import { assertTemperature, isValidDatetime, quarterMinutes } from "./proto/validation.js";
import { HubInfoDTO } from "./proto/dto.js";
import { EventEmitter } from "node:events";

export class NoboHub extends EventEmitter {
  private sock?: net.Socket;
  private zones = new Map<string, ZoneVO>();
  private comps = new Map<string, ComponentVO>();
  private weeks = new Map<string, WeekProfileVO>();
  private overrides = new Map<string, OverrideVO>();
  private temps = new Map<string, string>();
  private hubInfo?: HubInfoDTO;
  private lastRx = Date.now();

  constructor(private serial: string, private ip?: string, private useDiscovery = true) { super(); }

  // ───────────────────────── connect ─────────────────────────
  async connect(): Promise<void> {
    const hubs = this.useDiscovery ? await discoverHubs() : [[this.ip!, this.serial]] as Array<[string, string]>;
    for (const [ip, sn] of hubs) try { if (await this.connectTcp(ip, sn)) return; } catch {}
    throw new Error("Unable to connect to any hub");
  }

  private async connectTcp(ip: string, serial: string): Promise<boolean> {
    this.sock = net.createConnection({ host: ip, port: 27779 });
    await once(this.sock, "connect");
    this.sock.setKeepAlive(true, 20_000);

    await this.send([Cmd.START, PROTOCOL_VERSION, serial, this.ts14()]);
    const ok = await this.recvRaw();
    if (ok[0] !== Cmd.START) throw new Error("bad hello");
    await this.send([Cmd.HANDSHAKE]);
    const hs = await this.recvRaw();
    if (hs[0] !== Cmd.HANDSHAKE) throw new Error("handshake failed");

    this.pump(); // start frame pump
    await this.send([Cmd.GET_ALL_INFO]);
    await once(this, "ready");
    return true;
  }

  // ─────────────────── internal helpers ───────────────────
  private async send(words: string[]) { if (this.sock) await new Promise<void>((res, rej) => this.sock!.write(words.join(" ") + "\r", e => e ? rej(e) : res())); }
  private ts14(d = new Date()) { return d.toISOString().replace(/[^0-9]/g, "").slice(0, 14); }

    // single‑use receiver during handshake – strips trailing CR or CRLF
  private recvRaw(): Promise<string[]> {
    return new Promise(resolve => {
      this.sock!.once("data", buf => {
        const line = buf.toString("utf8").replace(/\r?\n?$/, "");
        resolve(line.split(" "));
      });
    });
  }

  private async pump() {
    if (!this.sock) return;
    // heartbeat – fire‑and‑forget
    const hb = setInterval(() => this.send([Cmd.HANDSHAKE]).catch(() => {}), 14_000);
    for await (const parts of frames(this.sock)) {
      this.lastRx = Date.now();
      this.dispatch(parse(parts));
    }
    clearInterval(hb);
  }

  private dispatch(msg: ResponseMessage) {
    switch (msg.t) {
      case Resp.SENDING_ALL_INFO:
        this.zones.clear(); this.comps.clear(); this.weeks.clear(); this.overrides.clear(); this.temps.clear(); break;
      case Resp.ZONE_INFO: case Resp.ADD_ZONE: case Resp.UPDATE_ZONE:
        this.zones.set(msg.zone.zoneId, new ZoneVO(msg.zone)); break;
      case Resp.COMPONENT_INFO: case Resp.ADD_COMPONENT: case Resp.UPDATE_COMPONENT:
        this.comps.set(msg.component.serial, new ComponentVO(msg.component)); break;
      case Resp.WEEK_PROFILE_INFO: case Resp.ADD_WEEK_PROFILE: case Resp.UPDATE_WEEK_PROFILE:
        this.weeks.set(msg.profile.weekProfileId, new WeekProfileVO(msg.profile)); break;
      case Resp.OVERRIDE_INFO: case Resp.ADD_OVERRIDE:
        this.overrides.set(msg.override.overrideId, new OverrideVO(msg.override)); break;
      case Resp.HUB_INFO: case Resp.UPDATE_HUB_INFO:
        this.hubInfo = msg.hub; if (msg.t === Resp.HUB_INFO) this.emit("ready"); break;
      case Resp.UPDATE_INTERNET_ACCESS:
        this.emit("internet", { enabled: msg.access === "1", key: msg.key }); break;
      case Resp.REMOVE_ZONE:        this.zones.delete(msg.zoneId); break;
      case Resp.REMOVE_COMPONENT:   this.comps.delete(msg.serial); break;
      case Resp.REMOVE_WEEK_PROFILE:this.weeks.delete(msg.weekProfileId); break;
      case Resp.REMOVE_OVERRIDE:    this.overrides.delete(msg.overrideId); break;
      case Resp.COMPONENT_TEMP:     this.temps.set(msg.serial, msg.temperature); break;
      case Resp.ERROR:              this.emit("error", new Error(`Hub error ${msg.code}: ${msg.message}`)); break;
    }
    this.emit("update", msg);
  }

  // ─────────────────────── public API ───────────────────────
  async setZoneTemperatures(id: string, comfort: number, eco: number) {
    const z = this.zones.get(id); if (!z) throw new Error("unknown zone");
    assertTemperature(comfort); assertTemperature(eco); if (comfort < eco) throw new Error("comfort<eco");
    await this.send([Cmd.UPDATE_ZONE, id, z.name, z.weekProfileId, comfort.toString(), eco.toString(), z.allowsOverride ? Override.Allowed.YES : Override.Allowed.NO, "-1"]);
  }

  async createOverride(opts: { mode: keyof typeof Override.Mode; type: keyof typeof Override.Type; targetType: keyof typeof Override.Target; targetId?: string; startTime?: string; endTime?: string }) {
    const { mode, type, targetType } = opts;
    const start = opts.startTime ?? "-1"; const end = opts.endTime ?? "-1"; const tgt = opts.targetId ?? "-1";
    if (start !== "-1" && (!isValidDatetime(start) || !quarterMinutes(start.slice(-2)))) throw new Error("bad start");
    if (end !== "-1" && (!isValidDatetime(end) || !quarterMinutes(end.slice(-2))))   throw new Error("bad end");
    await this.send([Cmd.ADD_OVERRIDE, "1", Override.Mode[mode], Override.Type[type], end, start, Override.Target[targetType], tgt]);
  }

  getZoneMode(id: string, when = new Date()): "eco" | "comfort" | "away" | "off" | "normal" {
    const z = this.zones.get(id); if (!z) throw new Error("bad zone");
    // override precedence
    for (const ov of this.overrides.values()) {
      if (ov.d.mode === Override.Mode.NORMAL) continue;
      if (ov.d.targetType === Override.Target.ZONE && ov.d.targetId === id) return mapMode(ov.d.mode);
      if (ov.d.targetType === Override.Target.GLOBAL && z.allowsOverride) return mapMode(ov.d.mode);
    }
    return this.weeks.get(z.weekProfileId)?.statusAt(when) ?? "normal";
  }
  getCurrentTemperature(id: string) {
    for (const c of this.comps.values()) if (c.d.zoneId === id) {
      const t = this.temps.get(c.d.serial); if (t && t !== "N/A") return t; }
    return null;
  }
}
function mapMode(m: string) {
  return m === "1" ? "comfort" : m === "2" ? "eco" : "away";
}
function once(emitter: net.Socket | EventEmitter, ev: string) { return new Promise<any>(res => emitter.once(ev, res)); }