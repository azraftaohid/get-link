import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { HttpHandler } from "@smithy/protocol-http";
import { StatSyncFn } from "fs";
import { getSharedRuntimeConfig } from "./runtimeConfig.shared";

let config: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
	if (!config) {
		config = {
			...getSharedRuntimeConfig(),
			runtime: "nodejs_compat",
			httpRequestHandler: new FetchHttpHandler(),
			httpPutRequestHandler: new XhrHttpHandler(),
		};
	}
	
	return config;
}

export interface RuntimeConfig {
	runtime: "node" | "browser" | "nodejs_compat",
	lstatSync: StatSyncFn,
	httpPutRequestHandler: HttpHandler,
	httpRequestHandler: HttpHandler,
}
