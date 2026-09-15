"use strict";
/** Build the bus from env: distributed → NATS, otherwise in-process. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBus = createBus;
const config_1 = require("@ore/config");
const bus_1 = require("./bus");
const nats_bus_1 = require("./nats.bus");
async function createBus(serviceName, env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    if (ore.orchestration === 'distributed') {
        const bus = new nats_bus_1.NatsBus(ore.natsUrl, serviceName, { user: ore.natsUser, pass: ore.natsPass }, ore.busSigningKey);
        await bus.connect();
        return bus;
    }
    return new bus_1.InProcessBus();
}
//# sourceMappingURL=factory.js.map