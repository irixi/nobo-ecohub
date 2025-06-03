export const PROTOCOL_VERSION = "1.1" as const;

/** Commands we *send* to the hub. */
export const enum Cmd {
  START = "HELLO",
  REJECT = "REJECT",
  HANDSHAKE = "HANDSHAKE",

  // Add
  ADD_ZONE = "A00",
  ADD_COMPONENT = "A01",
  ADD_WEEK_PROFILE = "A02",
  ADD_OVERRIDE = "A03",

  // Update
  UPDATE_ZONE = "U00",
  UPDATE_COMPONENT = "U01",
  UPDATE_WEEK_PROFILE = "U02",
  UPDATE_HUB_INFO = "U03",
  UPDATE_INTERNET_ACCESS = "U06",

  // Remove
  REMOVE_ZONE = "R00",
  REMOVE_COMPONENT = "R01",
  REMOVE_WEEK_PROFILE = "R02",

  // Get
  GET_ALL_INFO = "G00",
  GET_ALL_ZONES = "G01",
  GET_ALL_COMPONENTS = "G02",
  GET_ALL_WEEK_PROFILES = "G03",
  GET_ACTIVE_OVERRIDES = "G04",
}

/** Frames we *receive* from the hub. */
export const enum Resp {
  // Bulk / info
  SENDING_ALL_INFO = "H00",
  ZONE_INFO = "H01",
  COMPONENT_INFO = "H02",
  WEEK_PROFILE_INFO = "H03",
  OVERRIDE_INFO = "H04",
  HUB_INFO = "H05",
  HANDSHAKE = "HANDSHAKE",

  // Single‑object ACKs
  ADD_ZONE = "B00",
  ADD_COMPONENT = "B01",
  ADD_WEEK_PROFILE = "B02",
  ADD_OVERRIDE = "B03",

  UPDATE_ZONE = "V00",
  UPDATE_COMPONENT = "V01",
  UPDATE_WEEK_PROFILE = "V02",
  UPDATE_HUB_INFO = "V03",
  UPDATE_INTERNET_ACCESS = "V06",

  REMOVE_ZONE = "S00",
  REMOVE_COMPONENT = "S01",
  REMOVE_WEEK_PROFILE = "S02",
  REMOVE_OVERRIDE = "S03",

  // Telemetry
  COMPONENT_TEMP = "Y02",

  ERROR = "E00",
}

/** Override‑specific constants (modes, types, targets) */
export const Override = {
  Mode: {
    NORMAL: "0",
    COMFORT: "1",
    ECO: "2",
    AWAY: "3",
  } as const,
  Type: {
    NOW: "0",
    TIMER: "1",
    FROM_TO: "2",
    CONSTANT: "3",
  } as const,
  Target: {
    GLOBAL: "0",
    ZONE: "1",
    COMPONENT: "2",
  } as const,
  Allowed: {
    NO: "0",
    YES: "1",
  } as const,
};