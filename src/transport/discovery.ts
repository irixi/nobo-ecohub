import dgram from "node:dgram";

export async function discoverHubs(timeout = 3_000): Promise<Array<[string, string]>> {
  const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const hubs = new Map<string, string>();

  return new Promise((resolve, reject) => {
    sock.on("error", reject);
    sock.on("message", (msg, rinfo) => {
      const s = msg.toString();
      if (s.startsWith("__NOBOHUB__")) hubs.set(rinfo.address, s.slice(11));
    });
    sock.bind(10_000, () => sock.setBroadcast(true));
    setTimeout(() => { sock.close(); resolve([...hubs]); }, timeout);
  });
}