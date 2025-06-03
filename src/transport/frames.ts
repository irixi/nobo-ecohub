import net from "node:net";

/** Split a TCP stream into protocol frames (string[]). */
export async function* frames(socket: net.Socket): AsyncIterable<string[]> {
  let buf = "";
  for await (const chunk of socket) {
    buf += chunk.toString("utf8");
    const parts = buf.split("\r");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      if (p) yield p.split(" ");
    }
  }
}