import net from "node:net";

export async function* frames(sock: net.Socket): AsyncIterable<string[]> {
  let buf = "";
  for await (const chunk of sock) {
    buf += chunk.toString("utf8");
    let idx;
    while ((idx = buf.indexOf("\r")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (frame) yield frame.split(" ");
    }
  }
}