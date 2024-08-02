import type { DiscoveryConfig, HttpServiceConfig } from "shared/services";

import { ActionTypes } from "./action-types.js";

export type Config = {
    discovery: DiscoveryConfig;
    http: HttpServiceConfig;
};

export function Config(): Config {
    return {
        discovery: {
            name: String(process.env.DISCOVERY_NAME),
            actions: Object.values(ActionTypes),
            address: String(process.env.DISCOVERY_ADDRESS),
            registryAddress: String(process.env.DISCOVERY_SERVER_ADDRESS),
        },
        http: {
            port: Number(process.env.HTTP_PORT) || 3400,
        },
    };
}