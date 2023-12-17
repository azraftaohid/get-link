import { FirebaseApp } from "firebase/app";
import { Functions, connectFunctionsEmulator as connectEmulator, getFunctions as getInstance } from "firebase/functions";
import { Region } from "./region";

let mHost: string | undefined;
let mPort: number | undefined;

export function getFunctions(app?: FirebaseApp, region: Region = Region.ASIA_SOUTH_1) {
	return getInstance(app, region);
}

export function connectFunctionsEmulator(functionsInstance: Functions, host: string, port: number) {
	mHost = host;
	mPort = port;
	connectEmulator(functionsInstance, host, port);
}

export function getHttpEndpoint(funcName: string, region: Region) {
	if (mHost && mPort) return `http://${mHost}:${mPort}/project-hubble/${region}/${funcName}`;
	return `https://${region}-project-hubble.cloudfunctions.net/${funcName}`;
}
