import { StatSyncFn, lstatSync } from "fs";

import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpHandler } from "@smithy/protocol-http";
import { getSharedRuntimeConfig } from "./runtimeConfig.shared";

let config: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
	if (!config) {
		const requestHandler = new NodeHttpHandler();
		config = {
			...getSharedRuntimeConfig(),
			runtime: "node",
			lstatSync,
			httpPutRequestHandler: requestHandler,
			httpRequestHandler: requestHandler,
		};
	}
	
	return config;
}

export interface RuntimeConfig {
	runtime: "node" | "browser",
	lstatSync: StatSyncFn,
	httpPutRequestHandler: HttpHandler,
	httpRequestHandler: HttpHandler,
}
