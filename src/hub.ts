import net from "node:net";
import { PROTOCOL_VERSION, Cmd, Resp, Override } from "./proto/constants.js";
import { parse, ResponseMessage } from "./proto/parser.js";
import { frames } from "./transport/frames.js";
import { discoverHubs } from "./transport/discovery.js";
import { ZoneVO, ComponentVO, WeekProfileVO, OverrideVO } from "./model/valueObjects.js";
import {
  assertTemperature,
  isValidDatetime,
  quarterMinutes,
} from "./proto/validation.js";
import {
  HubInfoDTO,
  ZoneDTO,
  ComponentDTO,
  WeekProfileDTO,
  OverrideDTO,
} from "./proto/dto.js";

/** Public‑facing high‑level API */
export class NoboHub {
  // ────────────────────── state ──────────────────────
  private socket?: net.Socket;
  private zones = new Map<string, ZoneVO>();
  private components = new Map<string, ComponentVO>();
  private weekProfiles = new Map<string, WeekProfileVO>();
  private overrides = new Map<string, OverrideVO>();
  private temperatures = new Map<string, string>();
  private hubReady!: Promise<void>; // resolves when hub‑info received

  // ────────────────────── ctor ──────────────────────
  constructor(
    private readonly serial: string,
    private readonly ip?: string,
    private readonly discover = true,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ────────────────────── lifecycle ──────────────────────
  async connect(): Promise<void> {
    if (this.discover) {
      const hubs = await discoverHubs();
      for (const [ip, hubSerial] of hubs) {
        try {
          if (await this.connectTcp(ip, hubSerial)) break;
        } catch (err) {
          console.error(`connect to ${ip} failed`, err);
        }
      }
    } else if (this.ip) {
      await this.connectTcp(this.ip, this.serial);
    } else {
      throw new Error("Unable to connect: no IP or discovery");
    }
  }

  private async connectTcp(ip: string, hubSerial: string): Promise<boolean> {
    this.socket = net.createConnection({ 
      host: ip, 
      port: 27779, 
      timeout: 30000, 
      keepAlive: true, 
      keepAliveInitialDelay: 12000 
    });
    const sock = this.socket;

    const heartbeatInterval = setInterval(async () => {
      await this.send([Cmd.HANDSHAKE]);
      const response = await this.nextFrame();
       if (!response) throw new Error("handshake failed");
      //console.log("Heartbeat sent to hub");
    }, 10000); // Every 10 seconds

    sock.on("close", () => clearInterval(heartbeatInterval));

    await new Promise<void>((resolve, reject) => {
      sock.once("error", reject);
      sock.once("connect", () => resolve());
    });

    // handshake
    await this.send([Cmd.START, PROTOCOL_VERSION, hubSerial, this.timestamp14()]);
    const res1 = await this.nextFrame();
    if (res1[0] !== Cmd.START || res1[1] !== PROTOCOL_VERSION) {
      throw new Error("protocol‑version mismatch");
    }

    await this.send([Cmd.HANDSHAKE]);
    const res2 = await this.nextFrame();
    if (res2[0] !== Cmd.HANDSHAKE) throw new Error("handshake failed");

    // pump frames in background
    this.hubReady = this.bootstrap();

    return true;
  }

  private async bootstrap(): Promise<void> {
    if (!this.socket) throw new Error("socket not ready");
    await this.send([Cmd.GET_ALL_INFO]);

    for await (const raw of frames(this.socket)) {
      this.process(parse(raw));
      if (this.hubInfoReceived) {
        this.hubReady = Promise.resolve(); // Resolve the ready promise
      }
    }
  }

  private hubInfoReceived = false;

  // ────────────────────── protocol helpers ──────────────────────
  private send(words: string[]): Promise<void> {
    if (!this.socket) return Promise.reject(new Error("socket closed"));
    return new Promise((resolve, reject) => {
      this.socket!.write(words.join(" ") + "\r", err => (err ? reject(err) : resolve()));
    });
  }

  private nextFrame(): Promise<string[]> {
    if (!this.socket) return Promise.reject("socket closed");
    return new Promise(resolve => {
      const onData = (chunk: Buffer) => {
        const str = chunk.toString("utf8");
        const idx = str.indexOf("\r");
        if (idx !== -1) {
          this.socket!.off("data", onData);
          resolve(str.slice(0, idx).split(" "));
        }
      };
      this.socket!.on("data", onData);
    });
  }

  private timestamp14(date = new Date()): string {
    return date.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  }

  // ────────────────────── inbound frame handling ──────────────────────

  private isZoneResponse(m: ResponseMessage): m is ResponseMessage & { zone: ZoneDTO } {
    return m.t === Resp.ZONE_INFO || m.t === Resp.ADD_ZONE || m.t === Resp.UPDATE_ZONE;
  }

  private isComponentResponse(m: ResponseMessage): m is ResponseMessage & { component: ComponentDTO } {
    return m.t === Resp.COMPONENT_INFO || m.t === Resp.ADD_COMPONENT || m.t === Resp.UPDATE_COMPONENT;
  }

  private isWeekProfileResponse(m: ResponseMessage): m is ResponseMessage & { profile: WeekProfileDTO } {
    return m.t === Resp.WEEK_PROFILE_INFO || m.t === Resp.ADD_WEEK_PROFILE || m.t === Resp.UPDATE_WEEK_PROFILE;
  }

  private isOverrideResponse(m: ResponseMessage): m is ResponseMessage & { override: OverrideDTO } {
    return m.t === Resp.OVERRIDE_INFO || m.t === Resp.ADD_OVERRIDE;
  }

  private readonly handlers: Partial<Record<Resp, (m: ResponseMessage) => void>> = {
    [Resp.ZONE_INFO]:      m => this.isZoneResponse(m) && this.zones.set(m.zone.zoneId, new ZoneVO(m.zone)),
    [Resp.ADD_ZONE]:       m => this.isZoneResponse(m) && this.zones.set(m.zone.zoneId, new ZoneVO(m.zone)),
    [Resp.UPDATE_ZONE]:    m => this.isZoneResponse(m) && this.zones.set(m.zone.zoneId, new ZoneVO(m.zone)),

    [Resp.COMPONENT_INFO]: m => this.isComponentResponse(m) && this.components.set(m.component.serial, new ComponentVO(m.component)),
    [Resp.ADD_COMPONENT]:  m => this.isComponentResponse(m) && this.components.set(m.component.serial, new ComponentVO(m.component)),
    [Resp.UPDATE_COMPONENT]: m => this.isComponentResponse(m) && this.components.set(m.component.serial, new ComponentVO(m.component)),

    [Resp.WEEK_PROFILE_INFO]: m => this.isWeekProfileResponse(m) && this.weekProfiles.set(m.profile.weekProfileId, new WeekProfileVO(m.profile)),
    [Resp.ADD_WEEK_PROFILE]:  m => this.isWeekProfileResponse(m) && this.weekProfiles.set(m.profile.weekProfileId, new WeekProfileVO(m.profile)),
    [Resp.UPDATE_WEEK_PROFILE]: m => this.isWeekProfileResponse(m) && this.weekProfiles.set(m.profile.weekProfileId, new WeekProfileVO(m.profile)),

    [Resp.OVERRIDE_INFO]:  m => this.isOverrideResponse(m) && this.overrides.set(m.override.overrideId, new OverrideVO(m.override)),
    [Resp.ADD_OVERRIDE]:   m => this.isOverrideResponse(m) && this.overrides.set(m.override.overrideId, new OverrideVO(m.override)),

    [Resp.HUB_INFO]:       () => { this.hubInfoReceived = true; },

    [Resp.REMOVE_ZONE]:       m => 'zoneId' in m && this.zones.delete(m.zoneId),
    [Resp.REMOVE_COMPONENT]:  m => 'serial' in m && this.components.delete(m.serial),
    [Resp.REMOVE_WEEK_PROFILE]: m => 'weekProfileId' in m && this.weekProfiles.delete(m.weekProfileId),
    [Resp.REMOVE_OVERRIDE]:     m => 'overrideId' in m && this.overrides.delete(m.overrideId),

    [Resp.COMPONENT_TEMP]:  m => 'serial' in m && 'temperature' in m && this.temperatures.set(m.serial, m.temperature),

    [Resp.ERROR]:          m => 'code' in m && 'message' in m && console.error("hub error", m.code, m.message),
  } as const;

  private process(m: ResponseMessage): void {
    const handler = this.handlers[m.t];
    if (handler) {
      handler(m);
    }
  }

  // ──────────────────────  Public high‑level helpers  ──────────────────────

  /** Shortcut to change only temperatures. */
  async setZoneTemperatures(id: string, comfort: number, eco: number) {
    await this.hubReady;
    assertTemperature(comfort, "comfort");
    assertTemperature(eco, "eco");
    if (comfort < eco) throw new RangeError("comfort < eco");

    const zone = this.zones.get(id);
    if (!zone) throw new Error(`unknown zone ${id}`);

    await this.send([Cmd.UPDATE_ZONE, id, zone.name, zone.weekProfileId, String(comfort), String(eco), zone.allowsOverride ? Override.Allowed.YES : Override.Allowed.NO, "-1"]);
  }

  /** Create override with basic validation. */
  async createOverride(options: {
    mode: keyof typeof Override.Mode;
    type: keyof typeof Override.Type;
    targetType: keyof typeof Override.Target;
    targetId?: string;
    startTime?: string;
    endTime?: string;
  }) {
    await this.hubReady;
    const { mode, type, targetType } = options;
    const targetId = options.targetId ?? "-1";
    const start = options.startTime ?? "-1";
    const end = options.endTime ?? "-1";

    if (start !== "-1" && (!isValidDatetime(start) || !quarterMinutes(start.slice(-2)))) {
      throw new RangeError(`invalid start ${start}`);
    }
    if (end !== "-1" && (!isValidDatetime(end) || !quarterMinutes(end.slice(-2)))) {
      throw new RangeError(`invalid end ${end}`);
    }

    await this.send([Cmd.ADD_OVERRIDE, "1", Override.Mode[mode], Override.Type[type], end, start, Override.Target[targetType], targetId]);
  }

  /** Convenience helpers */
  getCurrentTemperature(zoneId: string): string | null {
    for (const comp of this.components.values()) {
      if (comp.dto.zoneId === zoneId) {
        const t = this.temperatures.get(comp.dto.serial);
        if (t) return t === "N/A" ? null : t;
      }
    }
    return null;
  }
}
