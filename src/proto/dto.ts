export interface HubInfoDTO {
  serial: string;
  name: string;
  defaultAwayOverrideLength: string;
  overrideId: string;
  softwareVersion: string;
  hardwareVersion: string;
  productionDate: string;
}
export interface ZoneDTO {
  zoneId: string; name: string; weekProfileId: string;
  tempComfortC: string; tempEcoC: string; overrideAllowed: string; deprecatedOverrideId: string;
}
export interface ComponentDTO {
  serial: string; status: string; name: string; reverseOnOff: string;
  zoneId: string; overrideId: string; tempSensorForZoneId: string;
  modelId?: string;
}
export interface WeekProfileDTO { weekProfileId: string; name: string; profile: string[]; }
export interface OverrideDTO { overrideId: string; mode: string; type: string; endTime: string; startTime: string; targetType: string; targetId: string; }