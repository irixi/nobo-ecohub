"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quarterMinutes = exports.isValidDatetime = void 0;
exports.assertTemperature = assertTemperature;
exports.assertUtf8 = assertUtf8;
const isValidDatetime = (ts) => /^\d{14}$/.test(ts);
exports.isValidDatetime = isValidDatetime;
const quarterMinutes = (m) => Number(m) % 15 === 0;
exports.quarterMinutes = quarterMinutes;
function assertTemperature(v, label = "temp") {
    const n = +v;
    if (!Number.isFinite(n))
        throw new TypeError(`${label} not numeric`);
    if (n < 7 || n > 30)
        throw new RangeError(`${label} out of range 7‑30°C`);
}
function assertUtf8(text, max, label) {
    if (Buffer.byteLength(text, "utf8") > max)
        throw new RangeError(`${label} >${max}B utf8`);
}
