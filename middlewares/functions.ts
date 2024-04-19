import { Region } from "../utils/region";

let mHost: string;
let mPort: number;

export function setupFunctionParams(host: string, port: number) {
	mHost = host;
	mPort = port;
}

export function getHttpEndpoint(funcName: string, region: Region) {
	if (mHost && mPort) return `http://${mHost}:${mPort}/project-hubble/${region}/${funcName}`;
	return `https://${region}-project-hubble.cloudfunctions.net/${funcName}`;
}
