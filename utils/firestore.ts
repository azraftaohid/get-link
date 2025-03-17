import { FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { emulatorHost } from "./firebase";

let hasInitFirestore = false;

export function initFirestore(app: FirebaseApp) {
	const firestore = getFirestore(app);

	if (!hasInitFirestore) {
		hasInitFirestore = true;
		if (process.env.NODE_ENV === "development") {
			connectFirestoreEmulator(firestore, emulatorHost, 8080);
		}
	}

	return firestore;
}
