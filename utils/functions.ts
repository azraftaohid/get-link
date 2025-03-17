import { FirebaseApp } from "firebase/app";
import { Functions, connectFunctionsEmulator as connectEmulator, getFunctions as getInstance } from "firebase/functions";
import { emulatorHost } from "./firebase";
import { Region } from "./region";

let mHost = globalThis.funcHost;
let mPort = globalThis.funcPort;

let hasInit = false;

export function initFunctions(app: FirebaseApp) {
	const functions = getInstance(app);

	if (!hasInit) {
		hasInit = true;
		if (process.env.NODE_ENV === "development") {
			connectFunctionsEmulator(functions, emulatorHost, 5001);
		}
	}

	return functions;
}

export function getFunctions(app?: FirebaseApp, region: Region = Region.ASIA_SOUTH_1) {
	return getInstance(app, region);
}

export function setupFunctionParams(host: string, port: number) {
	globalThis.funcHost = host;
	globalThis.funcPort = port;
	mHost = host;
	mPort = port;
}

export function connectFunctionsEmulator(functionsInstance: Functions, host: string, port: number) {
	setupFunctionParams(host, port);
	connectEmulator(functionsInstance, host, port);
}

export function getHttpEndpoint(funcName: string, region: Region) {
	if (mHost && mPort) return `http://${mHost}:${mPort}/project-hubble/${region}/${funcName}`;
	return `https://${region}-project-hubble.cloudfunctions.net/${funcName}`;
}
