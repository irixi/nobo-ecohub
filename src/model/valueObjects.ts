import { ZoneDTO, ComponentDTO, WeekProfileDTO, OverrideDTO } from "../proto/dto.js";
import { assertTemperature } from "../proto/validation.js";
import { Override } from "../proto/constants.js";
import { DEVICE_MODELS } from "./deviceModel.js";

export class ZoneVO {
  constructor(private d: ZoneDTO) { ZoneVO.validate(d); }
  static validate(z: ZoneDTO) {
    assertTemperature(z.tempComfortC, "comfort");
    assertTemperature(z.tempEcoC, "eco");
    if (+z.tempComfortC < +z.tempEcoC) throw new RangeError("comfort < eco");
  }
  patch(p: Partial<ZoneDTO>) { this.d = { ...this.d, ...p }; ZoneVO.validate(this.d); }
  get id() { return this.d.zoneId; }
  get name() { return this.d.name; }
  get weekProfileId() { return this.d.weekProfileId; }
  get allowsOverride() { return this.d.overrideAllowed === Override.Allowed.YES; }
  toJSON() { return this.d; }
}

export class ComponentVO {
  constructor(readonly d: ComponentDTO) {
    const modelId = d.serial.slice(0, 3);
    d.modelId = modelId;
    if (!("model" in d) && DEVICE_MODELS.has(modelId)) {
      (d as any).model = DEVICE_MODELS.get(modelId)!;
    }
  }
}

export class WeekProfileVO {
  constructor(readonly d: WeekProfileDTO) { WeekProfileVO.validate(d.profile); }

  // ───────────────────────── decode helpers ─────────────────────────
  static readonly CODE_TO_NAME = { "0": "eco", "1": "comfort", "2": "away", "4": "off" } as const;
  static readonly NAME_TO_CODE = { eco: "0", comfort: "1", away: "2", off: "4" } as const;
  static readonly WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

  /** Validate raw 5‑char entries */
  static validate(p: string[]) {
    if (p.length < 7) throw new Error("week profile needs ≥7 entries");
    for (const e of p) if (!/^[0-2][0-9][0-5][0-9][0124]$/.test(e)) throw new Error(`bad entry ${e}`);
    // ensure exactly 7 midnights (one per day)
    if (p.filter(e => e.startsWith("0000")).length !== 7) throw new Error("profile must contain 7 × 0000*");
  }

  /** Return eco/comfort/away/off at a specific Date */
  statusAt(date = new Date()): "eco" | "comfort" | "away" | "off" {
    const wkday = (date.getDay() + 6) % 7;             // Monday = 0
    const target = date.getHours() * 100 + date.getMinutes();
    let state = this.d.profile[0][4]; let day = 0;
    for (const ts of this.d.profile.slice(1)) {
      if (ts.startsWith("0000")) day++;
      if (day === wkday && +ts.slice(0, 4) <= target) state = ts[4];
    }
    return WeekProfileVO.CODE_TO_NAME[state as keyof typeof WeekProfileVO.CODE_TO_NAME];
  }

  /** Convert to a per‑day timetable: { Monday: [ { time:"06:00", mode:"comfort" }, … ] } */
  toTimetable(): Record<(typeof WeekProfileVO.WEEKDAYS)[number], { time: string; mode: keyof typeof WeekProfileVO.NAME_TO_CODE }[]> {
    const result: Record<string, { time: string; mode: any }[]> = Object.fromEntries(WeekProfileVO.WEEKDAYS.map(d => [d, []]));
    let dayIdx = 0;
    for (const entry of this.d.profile) {
      if (entry.startsWith("0000") && result[WeekProfileVO.WEEKDAYS[dayIdx]].length) dayIdx++;
      const hhmm = entry.slice(0, 4);
      const mode = WeekProfileVO.CODE_TO_NAME[entry[4] as keyof typeof WeekProfileVO.CODE_TO_NAME];
      result[WeekProfileVO.WEEKDAYS[dayIdx]].push({ time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`, mode });
    }
    return result as any;
  }

  // ─────────────────────── encode helpers ───────────────────────
  /** Build an encoded profile from a friendly timetable object */
  static build(name: string, timetable: Record<string, { time: string; mode: keyof typeof WeekProfileVO.NAME_TO_CODE }[]>): WeekProfileDTO {
    const days = WeekProfileVO.WEEKDAYS;
    const entries: string[] = [];
    for (const day of days) {
      const segments = timetable[day] || [];
      // ensure first entry of the day is at 00:00 in segments (or default eco)
      if (!segments.length || segments[0].time !== "00:00") segments.unshift({ time: "00:00", mode: "eco" });
      for (const seg of segments) {
        const [h, m] = seg.time.split(":").map(Number);
        if (m % 15) throw new Error(`time ${seg.time} not on 15‑minute boundary`);
        const hhmm = `${h.toString().padStart(2, "0")}${m.toString().padStart(2, "0")}`;
        entries.push(`${hhmm}${WeekProfileVO.NAME_TO_CODE[seg.mode]}`);
      }
    }
    WeekProfileVO.validate(entries);
    return { weekProfileId: "0", name, profile: entries };
  }
}

export class OverrideVO { constructor(readonly d: OverrideDTO) {} }