import { ZoneDTO, ComponentDTO, WeekProfileDTO, OverrideDTO } from "../proto/dto.js";
import { assertTemperature, assertLengthUtf8 } from "../proto/validation.js";
import { Override } from "../proto/constants.js";

export class ZoneVO {
  constructor(private _dto: ZoneDTO) {
    // invariants
    assertTemperature(_dto.tempComfortC, "tempComfortC");
    assertTemperature(_dto.tempEcoC, "tempEcoC");
    if (+_dto.tempComfortC < +_dto.tempEcoC) {
      throw new RangeError(`comfort (${_dto.tempComfortC}) < eco (${_dto.tempEcoC})`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  toJSON(): ZoneDTO { return this._dto; }

  get id() { return this._dto.zoneId; }
  get name() { return this._dto.name; }
  get weekProfileId() { return this._dto.weekProfileId; }
  get allowsOverride() { return this._dto.overrideAllowed === Override.Allowed.YES; }

  patch(patch: Partial<ZoneDTO>) {
    this._dto = { ...this._dto, ...patch };
    // re‑validate invariants
    ZoneVO.validate(this._dto);
  }

  static validate(dto: ZoneDTO) {
    new ZoneVO(dto); // constructor throws if invalid
  }
}

export class ComponentVO {
  constructor(readonly dto: ComponentDTO) {}
}

export class WeekProfileVO {
  constructor(readonly dto: WeekProfileDTO) {
    WeekProfileVO.validate(dto.profile);
  }
  static validate(profile: string[]) {
    if (profile.length < 7) throw new RangeError("week‑profile expects ≥7 entries");
    for (const entry of profile) {
      if (entry.length !== 5 || !["0", "1", "2", "4"].includes(entry[4])) {
        throw new RangeError(`invalid profile entry ${entry}`);
      }
    }
  }
}

export class OverrideVO {
  constructor(readonly dto: OverrideDTO) {}
}