export const isValidDatetime = (ts: string): boolean => /^\d{14}$/.test(ts);
export const quarterMinutes = (m: string): boolean => Number(m) % 15 === 0;
export function assertTemperature(v: number | string, label = "temp") {
  const n = +v;
  if (!Number.isFinite(n)) throw new TypeError(`${label} not numeric`);
  if (n < 7 || n > 30) throw new RangeError(`${label} out of range 7‑30°C`);
}
export function assertUtf8(text: string, max: number, label: string) {
  if (Buffer.byteLength(text, "utf8") > max) throw new RangeError(`${label} >${max}B utf8`);
}
