import { Resp } from "./constants.js";
import { HubInfoDTO, ZoneDTO, ComponentDTO, WeekProfileDTO, OverrideDTO } from "./dto.js";

export type ResponseMessage =
  | { t: Resp.ZONE_INFO | Resp.ADD_ZONE | Resp.UPDATE_ZONE; zone: ZoneDTO }
  | { t: Resp.COMPONENT_INFO | Resp.ADD_COMPONENT | Resp.UPDATE_COMPONENT; component: ComponentDTO }
  | { t: Resp.WEEK_PROFILE_INFO | Resp.ADD_WEEK_PROFILE | Resp.UPDATE_WEEK_PROFILE; profile: WeekProfileDTO }
  | { t: Resp.OVERRIDE_INFO | Resp.ADD_OVERRIDE; override: OverrideDTO }
  | { t: Resp.HUB_INFO | Resp.UPDATE_HUB_INFO; hub: HubInfoDTO }
  | { t: Resp.SENDING_ALL_INFO }
  | { t: Resp.UPDATE_INTERNET_ACCESS; access: string; key: string }
  | { t: Resp.REMOVE_ZONE; zoneId: string }
  | { t: Resp.REMOVE_COMPONENT; serial: string }
  | { t: Resp.REMOVE_WEEK_PROFILE; weekProfileId: string }
  | { t: Resp.REMOVE_OVERRIDE; overrideId: string }
  | { t: Resp.COMPONENT_TEMP; serial: string; temperature: string }
  | { t: Resp.HANDSHAKE }
  | { t: Resp.ERROR; code: string; message: string };

// Manual list because Resp is declared as *const enum* (erased at runtime)
const RESP_CODES = new Set<string>([
  "H00","H01","H02","H03","H04","H05","HANDSHAKE",
  "B00","B01","B02","B03",
  "V00","V01","V02","V03","V06",
  "S00","S01","S02","S03",
  "Y02",
  "E00"
]);
function guard(code: string): Resp {
  if (!RESP_CODES.has(code)) throw new Error(`Unknown response ${code}`);
  return code as Resp;
}

export function parse(parts: string[]): ResponseMessage {
  const code = guard(parts[0]);
  switch (code) {
    case Resp.SENDING_ALL_INFO:      return { t: code };
    case Resp.HANDSHAKE:             return { t: code };

    case Resp.ZONE_INFO:
    case Resp.ADD_ZONE:
    case Resp.UPDATE_ZONE: {
      const [_, zoneId, name, wpId, tC, tE, ov, dep] = parts;
      return { t: code, zone: { zoneId, name, weekProfileId: wpId, tempComfortC: tC, tempEcoC: tE, overrideAllowed: ov, deprecatedOverrideId: dep } };
    }
    case Resp.COMPONENT_INFO:
    case Resp.ADD_COMPONENT:
    case Resp.UPDATE_COMPONENT: {
      const [_, serial, status, name, rev, zoneId, overrideId, sensorFor] = parts;
      return { t: code, component: { serial, status, name, reverseOnOff: rev, zoneId, overrideId, tempSensorForZoneId: sensorFor } };
    }
    case Resp.WEEK_PROFILE_INFO:
    case Resp.ADD_WEEK_PROFILE:
    case Resp.UPDATE_WEEK_PROFILE: {
      const [_, id, name, csv] = parts;
      return { t: code, profile: { weekProfileId: id, name, profile: csv.split(",") } };
    }
    case Resp.OVERRIDE_INFO:
    case Resp.ADD_OVERRIDE: {
      const [_, id, mode, type, end, start, trgType, trgId] = parts;
      return { t: code, override: { overrideId: id, mode, type, endTime: end, startTime: start, targetType: trgType, targetId: trgId } };
    }
    case Resp.HUB_INFO:
    case Resp.UPDATE_HUB_INFO: {
      const [_, serial, name, defAway, ovId, sw, hw, prod] = parts;
      return { t: code, hub: { serial, name, defaultAwayOverrideLength: defAway, overrideId: ovId, softwareVersion: sw, hardwareVersion: hw, productionDate: prod } };
    }
    case Resp.UPDATE_INTERNET_ACCESS:
      return { t: code, access: parts[1], key: parts[2] };
    case Resp.REMOVE_ZONE:          return { t: code, zoneId: parts[1] };
    case Resp.REMOVE_COMPONENT:     return { t: code, serial: parts[1] };
    case Resp.REMOVE_WEEK_PROFILE:  return { t: code, weekProfileId: parts[1] };
    case Resp.REMOVE_OVERRIDE:      return { t: code, overrideId: parts[1] };
    case Resp.COMPONENT_TEMP:       return { t: code, serial: parts[1], temperature: parts[2] };
    case Resp.ERROR: {
      const [__, err, ...msg] = parts; return { t: code, code: err, message: msg.join(" ") };
    }
  }
}