"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverHubs = discoverHubs;
const node_dgram_1 = __importDefault(require("node:dgram"));
async function discoverHubs(timeout = 3000) {
    const sock = node_dgram_1.default.createSocket({ type: "udp4", reuseAddr: true });
    const hubs = new Map();
    return new Promise((resolve, reject) => {
        sock.on("error", reject);
        sock.on("message", (msg, rinfo) => {
            const s = msg.toString();
            if (s.startsWith("__NOBOHUB__"))
                hubs.set(rinfo.address, s.slice(11));
        });
        sock.bind(10000, () => sock.setBroadcast(true));
        setTimeout(() => { sock.close(); resolve([...hubs]); }, timeout);
    });
}
