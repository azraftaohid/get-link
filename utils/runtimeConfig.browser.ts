import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { RuntimeConfig } from "./runtimeConfig";
import { getSharedRuntimeConfig } from "./runtimeConfig.shared";

let config: RuntimeConfig;

export function getRuntimeConfig(): RuntimeConfig {
	if (!config) {
		config = {
			...getSharedRuntimeConfig(),
			runtime: "browser",
			httpRequestHandler: new FetchHttpHandler(),
			httpPutRequestHandler: new XhrHttpHandler(),
		};
	}

	return config;
}
