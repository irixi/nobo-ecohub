"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVICE_MODELS = exports.DeviceModel = void 0;
class DeviceModel {
    constructor(modelId, type, name, supportsComfort = false, supportsEco = false, requiresControlPanel = false, hasTempSensor = false) {
        this.modelId = modelId;
        this.type = type;
        this.name = name;
        this.supportsComfort = supportsComfort;
        this.supportsEco = supportsEco;
        this.requiresControlPanel = requiresControlPanel;
        this.hasTempSensor = hasTempSensor;
    }
}
exports.DeviceModel = DeviceModel;
DeviceModel.THERMOSTAT_HEATER = "THERMOSTAT_HEATER";
DeviceModel.THERMOSTAT_FLOOR = "THERMOSTAT_FLOOR";
DeviceModel.THERMOSTAT_ROOM = "THERMOSTAT_ROOM";
DeviceModel.SWITCH = "SWITCH";
DeviceModel.SWITCH_OUTLET = "SWITCH_OUTLET";
DeviceModel.CONTROL_PANEL = "CONTROL_PANEL";
DeviceModel.UNKNOWN = "UNKNOWN";
exports.DEVICE_MODELS = new Map([
    ["120", new DeviceModel("120", DeviceModel.SWITCH, "RS 700")],
    ["121", new DeviceModel("121", DeviceModel.SWITCH, "RSX 700")],
    ["130", new DeviceModel("130", DeviceModel.SWITCH_OUTLET, "RCE 700")],
    ["160", new DeviceModel("160", DeviceModel.THERMOSTAT_HEATER, "R80 RDC 700")],
    ["165", new DeviceModel("165", DeviceModel.THERMOSTAT_HEATER, "R80 RDC 700 LST (GB)")],
    ["168", new DeviceModel("168", DeviceModel.THERMOSTAT_HEATER, "NCU‑2R", true, true)],
    ["169", new DeviceModel("169", DeviceModel.THERMOSTAT_HEATER, "DCU‑2R", true, true)],
    ["170", new DeviceModel("170", DeviceModel.THERMOSTAT_HEATER, "Serie 18, ewt touch", true, true)],
    ["180", new DeviceModel("180", DeviceModel.THERMOSTAT_HEATER, "2NC9 700", false, true)],
    ["182", new DeviceModel("182", DeviceModel.THERMOSTAT_HEATER, "R80 RSC 700 (5‑24)", false, true)],
    ["183", new DeviceModel("183", DeviceModel.THERMOSTAT_HEATER, "R80 RSC 700 (5‑30)", false, true)],
    ["184", new DeviceModel("184", DeviceModel.THERMOSTAT_HEATER, "NCU‑1R", false, true)],
    ["186", new DeviceModel("186", DeviceModel.THERMOSTAT_HEATER, "DCU‑1R", false, true)],
    ["190", new DeviceModel("190", DeviceModel.THERMOSTAT_HEATER, "Safir", true, true, true)],
    ["192", new DeviceModel("192", DeviceModel.THERMOSTAT_HEATER, "R80 TXF 700", true, true, true)],
    ["194", new DeviceModel("194", DeviceModel.THERMOSTAT_HEATER, "R80 RXC 700", true, true)],
    ["198", new DeviceModel("198", DeviceModel.THERMOSTAT_HEATER, "NCU‑ER", true, true)],
    ["199", new DeviceModel("199", DeviceModel.THERMOSTAT_HEATER, "DCU‑ER", true, true)],
    ["200", new DeviceModel("200", DeviceModel.THERMOSTAT_FLOOR, "TRB 36 700")],
    ["210", new DeviceModel("210", DeviceModel.THERMOSTAT_FLOOR, "NTB‑2R", true, true)],
    ["220", new DeviceModel("220", DeviceModel.THERMOSTAT_FLOOR, "TR36", false, true)],
    ["230", new DeviceModel("230", DeviceModel.THERMOSTAT_ROOM, "TCU 700")],
    ["231", new DeviceModel("231", DeviceModel.THERMOSTAT_ROOM, "THB 700")],
    ["232", new DeviceModel("232", DeviceModel.THERMOSTAT_ROOM, "TXB 700")],
    ["234", new DeviceModel("234", DeviceModel.CONTROL_PANEL, "SW4", false, false, false, true)],
]);
