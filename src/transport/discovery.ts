import dgram from "node:dgram";

/**
 * Broadcast UDP discovery and collect answers for *timeout* ms.
 * Returns tuples `[ip, serial]`.
 */
export async function discoverHubs(timeout = 3_000): Promise<Array<[string, string]>> {
  const socket = dgram.createSocket("udp4");
  const hubs = new Map<string, string>();

  return new Promise((resolve, reject) => {
    socket.on("error", reject);

    socket.on("message", (msg, { address }) => {
      const str = msg.toString();
      if (str.startsWith("__NOBOHUB__")) {
        hubs.set(address, str.slice(11));
      }
    });

    socket.bind(10_000, () => {
      socket.setBroadcast(true);
    });

    setTimeout(() => {
      socket.close();
      resolve([...hubs.entries()]);
    }, timeout);
  });
}