export function isValidDatetime(ts: string): boolean {
  return /^\d{14}$/.test(ts);
}

export function quarterMinutes(mins: string): boolean {
  const m = Number(mins);
  return m >= 0 && m < 60 && m % 15 === 0;
}

export function assertTemperature(temp: number | string, label = "temperature"): void {
  const val = Number(temp);
  if (!Number.isFinite(val)) throw new RangeError(`${label} must be numeric`);
  if (val < 7 || val > 30) throw new RangeError(`${label} must be between 7 – 30 °C`);
}

export function assertLengthUtf8(text: string, bytes: number, label: string): void {
  if (Buffer.byteLength(text, "utf8") > bytes) {
    throw new RangeError(`${label} is longer than ${bytes} bytes (utf‑8)`);
  }
}