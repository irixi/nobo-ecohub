import { NoboHub } from 'nobo-ecohub';

const hub = new NoboHub('123000456789'); // last 3 or full 12‑digit serial
hub.on('ready', () => {
    console.log(`Connected to ${hub.hubInfo.name} s/n ${hub.hubInfo.serial}`)
    console.log('zones:', [...hub.zones.values()].map(z => z.name));
})
await hub.connect();