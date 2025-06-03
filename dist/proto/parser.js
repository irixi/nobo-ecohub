"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
// Manual list because Resp is declared as *const enum* (erased at runtime)
const RESP_CODES = new Set([
    "H00", "H01", "H02", "H03", "H04", "H05", "HANDSHAKE",
    "B00", "B01", "B02", "B03",
    "V00", "V01", "V02", "V03", "V06",
    "S00", "S01", "S02", "S03",
    "Y02",
    "E00"
]);
function guard(code) {
    if (!RESP_CODES.has(code))
        throw new Error(`Unknown response ${code}`);
    return code;
}
function parse(parts) {
    const code = guard(parts[0]);
    switch (code) {
        case "H00" /* Resp.SENDING_ALL_INFO */: return { t: code };
        case "HANDSHAKE" /* Resp.HANDSHAKE */: return { t: code };
        case "H01" /* Resp.ZONE_INFO */:
        case "B00" /* Resp.ADD_ZONE */:
        case "V00" /* Resp.UPDATE_ZONE */: {
            const [_, zoneId, name, wpId, tC, tE, ov, dep] = parts;
            return { t: code, zone: { zoneId, name, weekProfileId: wpId, tempComfortC: tC, tempEcoC: tE, overrideAllowed: ov, deprecatedOverrideId: dep } };
        }
        case "H02" /* Resp.COMPONENT_INFO */:
        case "B01" /* Resp.ADD_COMPONENT */:
        case "V01" /* Resp.UPDATE_COMPONENT */: {
            const [_, serial, status, name, rev, zoneId, overrideId, sensorFor] = parts;
            return { t: code, component: { serial, status, name, reverseOnOff: rev, zoneId, overrideId, tempSensorForZoneId: sensorFor } };
        }
        case "H03" /* Resp.WEEK_PROFILE_INFO */:
        case "B02" /* Resp.ADD_WEEK_PROFILE */:
        case "V02" /* Resp.UPDATE_WEEK_PROFILE */: {
            const [_, id, name, csv] = parts;
            return { t: code, profile: { weekProfileId: id, name, profile: csv.split(",") } };
        }
        case "H04" /* Resp.OVERRIDE_INFO */:
        case "B03" /* Resp.ADD_OVERRIDE */: {
            const [_, id, mode, type, end, start, trgType, trgId] = parts;
            return { t: code, override: { overrideId: id, mode, type, endTime: end, startTime: start, targetType: trgType, targetId: trgId } };
        }
        case "H05" /* Resp.HUB_INFO */:
        case "V03" /* Resp.UPDATE_HUB_INFO */: {
            const [_, serial, name, defAway, ovId, sw, hw, prod] = parts;
            return { t: code, hub: { serial, name, defaultAwayOverrideLength: defAway, overrideId: ovId, softwareVersion: sw, hardwareVersion: hw, productionDate: prod } };
        }
        case "V06" /* Resp.UPDATE_INTERNET_ACCESS */:
            return { t: code, access: parts[1], key: parts[2] };
        case "S00" /* Resp.REMOVE_ZONE */: return { t: code, zoneId: parts[1] };
        case "S01" /* Resp.REMOVE_COMPONENT */: return { t: code, serial: parts[1] };
        case "S02" /* Resp.REMOVE_WEEK_PROFILE */: return { t: code, weekProfileId: parts[1] };
        case "S03" /* Resp.REMOVE_OVERRIDE */: return { t: code, overrideId: parts[1] };
        case "Y02" /* Resp.COMPONENT_TEMP */: return { t: code, serial: parts[1], temperature: parts[2] };
        case "E00" /* Resp.ERROR */: {
            const [__, err, ...msg] = parts;
            return { t: code, code: err, message: msg.join(" ") };
        }
    }
}
