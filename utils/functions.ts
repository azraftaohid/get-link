import { FirebaseApp } from "firebase/app";
import { getFunctions as getInstance } from "firebase/functions";
import { Region } from "./region";

export function getFunctions(app?: FirebaseApp, region: Region = Region.ASIA_SOUTH_1) {
	return getInstance(app, region);
}
