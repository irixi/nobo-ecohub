# nobo‑ecohub

**Modern TypeScript SDK & CLI for the Nobø Ecohub (discontinued) smart‑heating gateway from Glen Dimplex Nordic AS** – feature‑parity with the [pynobo](https://github.com/echoromeo/pynobo) project, plus:

* fully‑typed public API (strict `isolatedModules`, ESM)
* auto‑reconnect & heartbeat watchdog
* async‑iterator frame pump (zero race conditions)
* value‑objects with runtime validation
* week‑profile **encode / decode** helpers
* Node `EventEmitter` events for reactive apps

> Tested on software version `1.1.5` and firmware `11123610_rev._1`

---

## Quick start

```bash
# 1. install
pnpm i nobo-ecohub
# 2. compile (only when using repo directly)
pnpm run build
# 3. use
node examples/connect.mjs  # ESM only, use .cjs for CommonJS
```

```ts
// examples/connect.mjs
import { NoboHub } from 'nobo-ecohub';

const hub = new NoboHub('123000456789'); // last 3 or full 12‑digit serial
await hub.connect();
console.log('zones:', [...hub.zones.values()].map(z => z.name));
```

*If an `ip` is supplied (`new NoboHub(serial, '192.168.1.12', false)`), UDP discovery is skipped.*

---

## Library overview

### `NoboHub` (extends `EventEmitter`)

| Event        | Payload                                                        |
|--------------|----------------------------------------------------------------|
| `ready`      | — emitted once after initial `GET_ALL_INFO` snapshot           |
| `update`     | **`ResponseMessage`** for *every* inbound frame                |
| `internet`   | `{ enabled: boolean, key: string }` – from `V06`               |
| `error`      | `Error` – bubbled hub errors (`E00 code message`)              |

#### Core methods

| Method | Purpose |
|--------|---------|
| `connect()` | Discover (UDP 10000) **or** connect directly → TCP 27779. Handshake + snapshot.
| `setZoneTemperatures(zoneId, comfort, eco)` | Patch only the zone’s two temperature set‑points.
| `createOverride(opts)` | High‑level wrapper for `ADD_OVERRIDE` – validates mode / type / target.
| `getZoneMode(zoneId, [date])` | Resolve final mode (override ⤴ weekly‑profile) at optional *date*.
| `getCurrentTemperature(zoneId)` | First non‑`N/A` reading in zone, or `null`.

### Value objects

* `ZoneVO` – invariants (`comfort ≥ eco`).
* `ComponentVO` – auto‑adds **DeviceModel** metadata by serial prefix.
* `WeekProfileVO`
  * `toTimetable()` → friendly per‑day JSON.
  * `statusAt(date)` → `eco | comfort | away | off`.
  * `WeekProfileVO.build(name, timetable)` → encoded `WeekProfileDTO` ready for `ADD/UPDATE_WEEK_PROFILE`.

---

## Creating an **optimised day‑ahead profile**

```ts
import { WeekProfileVO } from 'nobo-ecohub';

// input: JSON forecast → { day: [ { time, mode }, … ] }
const timetable = JSON.parse(await fs.readFile('tomorrow.json', 'utf8'));
const dto = WeekProfileVO.build('Tomorrow', timetable);
await hub.createWeekProfile(dto);           // your own wrapper around ADD_WEEK_PROFILE
await hub.setZoneTemperatures('12', 22, 17); // optional comfort/eco tweak
```

*Times **must** align to 15‑minute boundaries; midnight (`00:00`) is auto‑inserted if missing.*

---

## Dev setup

```bash
git clone https://github.com/your‑org/nobo‑ecohub.git
cd nobo‑ecohub
pnpm install
pnpm run test      # vitest
pnpm run lint      # eslint + ts‑strict
```

### Building the docs locally

```bash
pnpm run docs      # generated with typedoc → docs/ folder
```

---

## Protocol reference (abridged)

| Cmd | Meaning | Frame structure |
|-----|---------|-----------------|
| `HELLO` | handshake | `HELLO <ver> <serial> <YYYYMMDDhhmmss>` |
| `A00`   | add zone  | `A00 <zone‑id> <name> …` |
| `U00`   | update zone | same layout as *add* |
| `G00`   | snapshot    | triggers `H00 … H05` burst |
| …       | *(see `src/proto/constants.ts`)* | |

Full field descriptions live in **`src/proto/constants.ts`** comments.

---

## Contributing

1. Open an issue (bug, feature, question).
2. PRs welcome – ensure `pnpm run test` passes.
3. Leave commit messages in conventional‑commits style.

---

## License

MIT © 2025 – Kim Forsman