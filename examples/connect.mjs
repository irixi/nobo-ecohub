import { NoboHub } from 'nobo-ecohub';

const hub = new NoboHub('123000456789'); // last 3 or full 12‑digit serial
await hub.connect();
console.log('zones:', [...hub.zones.values()].map(z => z.name));