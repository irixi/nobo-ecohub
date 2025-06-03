"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverrideVO = exports.WeekProfileVO = exports.ComponentVO = exports.ZoneVO = void 0;
const validation_js_1 = require("../proto/validation.js");
const constants_js_1 = require("../proto/constants.js");
const deviceModel_js_1 = require("./deviceModel.js");
class ZoneVO {
    constructor(d) {
        this.d = d;
        ZoneVO.validate(d);
    }
    static validate(z) {
        (0, validation_js_1.assertTemperature)(z.tempComfortC, "comfort");
        (0, validation_js_1.assertTemperature)(z.tempEcoC, "eco");
        if (+z.tempComfortC < +z.tempEcoC)
            throw new RangeError("comfort < eco");
    }
    patch(p) { this.d = { ...this.d, ...p }; ZoneVO.validate(this.d); }
    get id() { return this.d.zoneId; }
    get name() { return this.d.name; }
    get weekProfileId() { return this.d.weekProfileId; }
    get allowsOverride() { return this.d.overrideAllowed === constants_js_1.Override.Allowed.YES; }
    toJSON() { return this.d; }
}
exports.ZoneVO = ZoneVO;
class ComponentVO {
    constructor(d) {
        this.d = d;
        const modelId = d.serial.slice(0, 3);
        d.modelId = modelId;
        if (!("model" in d) && deviceModel_js_1.DEVICE_MODELS.has(modelId)) {
            d.model = deviceModel_js_1.DEVICE_MODELS.get(modelId);
        }
    }
}
exports.ComponentVO = ComponentVO;
class WeekProfileVO {
    constructor(d) {
        this.d = d;
        WeekProfileVO.validate(d.profile);
    }
    /** Validate raw 5‑char entries */
    static validate(p) {
        if (p.length < 7)
            throw new Error("week profile needs ≥7 entries");
        for (const e of p)
            if (!/^[0-2][0-9][0-5][0-9][0124]$/.test(e))
                throw new Error(`bad entry ${e}`);
        // ensure exactly 7 midnights (one per day)
        if (p.filter(e => e.startsWith("0000")).length !== 7)
            throw new Error("profile must contain 7 × 0000*");
    }
    /** Return eco/comfort/away/off at a specific Date */
    statusAt(date = new Date()) {
        const wkday = (date.getDay() + 6) % 7; // Monday = 0
        const target = date.getHours() * 100 + date.getMinutes();
        let state = this.d.profile[0][4];
        let day = 0;
        for (const ts of this.d.profile.slice(1)) {
            if (ts.startsWith("0000"))
                day++;
            if (day === wkday && +ts.slice(0, 4) <= target)
                state = ts[4];
        }
        return WeekProfileVO.CODE_TO_NAME[state];
    }
    /** Convert to a per‑day timetable: { Monday: [ { time:"06:00", mode:"comfort" }, … ] } */
    toTimetable() {
        const result = Object.fromEntries(WeekProfileVO.WEEKDAYS.map(d => [d, []]));
        let dayIdx = 0;
        for (const entry of this.d.profile) {
            if (entry.startsWith("0000") && result[WeekProfileVO.WEEKDAYS[dayIdx]].length)
                dayIdx++;
            const hhmm = entry.slice(0, 4);
            const mode = WeekProfileVO.CODE_TO_NAME[entry[4]];
            result[WeekProfileVO.WEEKDAYS[dayIdx]].push({ time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`, mode });
        }
        return result;
    }
    // ─────────────────────── encode helpers ───────────────────────
    /** Build an encoded profile from a friendly timetable object */
    static build(name, timetable) {
        const days = WeekProfileVO.WEEKDAYS;
        const entries = [];
        for (const day of days) {
            const segments = timetable[day] || [];
            // ensure first entry of the day is at 00:00 in segments (or default eco)
            if (!segments.length || segments[0].time !== "00:00")
                segments.unshift({ time: "00:00", mode: "eco" });
            for (const seg of segments) {
                const [h, m] = seg.time.split(":").map(Number);
                if (m % 15)
                    throw new Error(`time ${seg.time} not on 15‑minute boundary`);
                const hhmm = `${h.toString().padStart(2, "0")}${m.toString().padStart(2, "0")}`;
                entries.push(`${hhmm}${WeekProfileVO.NAME_TO_CODE[seg.mode]}`);
            }
        }
        WeekProfileVO.validate(entries);
        return { weekProfileId: "0", name, profile: entries };
    }
}
exports.WeekProfileVO = WeekProfileVO;
// ───────────────────────── decode helpers ─────────────────────────
WeekProfileVO.CODE_TO_NAME = { "0": "eco", "1": "comfort", "2": "away", "4": "off" };
WeekProfileVO.NAME_TO_CODE = { eco: "0", comfort: "1", away: "2", off: "4" };
WeekProfileVO.WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
class OverrideVO {
    constructor(d) {
        this.d = d;
    }
}
exports.OverrideVO = OverrideVO;
