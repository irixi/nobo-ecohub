import { Resp, Override } from "./constants.js";
import {
  HubInfoDTO,
  ZoneDTO,
  ComponentDTO,
  WeekProfileDTO,
  OverrideDTO,
} from "./dto.js";

/**
 * Strongly‑typed frame produced by the parser. Use `t` as discriminant.
 */
export type ResponseMessage =
  | { t: Resp.ZONE_INFO | Resp.ADD_ZONE | Resp.UPDATE_ZONE; zone: ZoneDTO }
  | { t: Resp.COMPONENT_INFO | Resp.ADD_COMPONENT | Resp.UPDATE_COMPONENT; component: ComponentDTO }
  | { t: Resp.WEEK_PROFILE_INFO | Resp.ADD_WEEK_PROFILE | Resp.UPDATE_WEEK_PROFILE; profile: WeekProfileDTO }
  | { t: Resp.OVERRIDE_INFO | Resp.ADD_OVERRIDE; override: OverrideDTO }
  | { t: Resp.HUB_INFO | Resp.UPDATE_HUB_INFO; hub: HubInfoDTO }
  | { t: Resp.REMOVE_ZONE; zoneId: string }
  | { t: Resp.REMOVE_COMPONENT; serial: string }
  | { t: Resp.REMOVE_WEEK_PROFILE; weekProfileId: string }
  | { t: Resp.REMOVE_OVERRIDE; overrideId: string }
  | { t: Resp.COMPONENT_TEMP; serial: string; temperature: string }
  | { t: Resp.UPDATE_INTERNET_ACCESS; access: string, key: string}
  | { t: Resp.HANDSHAKE | Resp.SENDING_ALL_INFO; }
  | { t: Resp.ERROR; code: string; message: string };

/**
 * Convert a raw string array (already split by space) into *one* typed
 * `ResponseMessage`.  Throws on protocol mismatch.
 */
export function parse(raw: string[]): ResponseMessage {
  const [code] = raw;

  const toResp = (code: string): Resp => {
    // This type guard ensures the string is properly typed as Resp
    if (!(code as Resp)) {
    throw new Error(`Invalid Resp code: ${code}`);
    }
    const resp = code as Resp;
    //console.log(`Parsing ${resp}`)
    // Add any additional validation here if needed
    return resp;
  };

  const typedCode = toResp(code);
  switch (typedCode) {
    case Resp.ZONE_INFO:
    case Resp.ADD_ZONE:
    case Resp.UPDATE_ZONE: {
      const [_, zoneId, name, weekProfileId, tComfort, tEco, ovAllowed, deprecOvId] = raw;
      return {
        t: typedCode,
        zone: { zoneId, name, weekProfileId, tempComfortC: tComfort, tempEcoC: tEco, overrideAllowed: ovAllowed, deprecatedOverrideId: deprecOvId },
      };
    }

    case Resp.COMPONENT_INFO:
    case Resp.ADD_COMPONENT:
    case Resp.UPDATE_COMPONENT: {
      const [_, serial, status, name, rev, zoneId, overrideId, sensorFor] = raw;
      return { t: typedCode, component: { serial, status, name, reverseOnOff: rev, zoneId, overrideId, tempSensorForZoneId: sensorFor } };
    }

    case Resp.WEEK_PROFILE_INFO:
    case Resp.ADD_WEEK_PROFILE:
    case Resp.UPDATE_WEEK_PROFILE: {
      const [_, weekProfileId, name, csv] = raw;
      return { t: typedCode, profile: { weekProfileId, name, profile: csv.split(",") } };
    }

    case Resp.OVERRIDE_INFO:
    case Resp.ADD_OVERRIDE: {
      const [_, overrideId, mode, type, endTime, startTime, targetType, targetId] = raw;
      return { t: typedCode, override: { overrideId, mode, type, endTime, startTime, targetType, targetId } };
    }

    case Resp.HUB_INFO:
    case Resp.UPDATE_HUB_INFO: {
      const [_, serial, name, defaultAway, overrideId, swVer, hwVer, prodDate] = raw;
      return {
        t: typedCode,
        hub: { serial, name, defaultAwayOverrideLength: defaultAway, overrideId, softwareVersion: swVer, hardwareVersion: hwVer, productionDate: prodDate },
      };
    }

    case Resp.REMOVE_ZONE:   return { t: typedCode, zoneId: raw[1] };
    case Resp.REMOVE_COMPONENT: return { t: typedCode, serial: raw[1] };
    case Resp.REMOVE_WEEK_PROFILE: return { t: typedCode, weekProfileId: raw[1] };
    case Resp.REMOVE_OVERRIDE: return { t: typedCode, overrideId: raw[1] };
    case Resp.COMPONENT_TEMP: return { t: typedCode, serial: raw[1], temperature: raw[2] };
    case Resp.UPDATE_INTERNET_ACCESS: return {t: typedCode, access: raw[1], key: raw[2]};
    case Resp.SENDING_ALL_INFO: return {t: typedCode};
    case Resp.HANDSHAKE: return {t: typedCode};

    case Resp.ERROR: {
      const [__, errCode, ...msg] = raw;
      return { t: typedCode, code: errCode, message: msg.join(" ") };
    }

    default:
      throw new Error(`Response code ${code as Resp} is not mapped`);
  }
}
