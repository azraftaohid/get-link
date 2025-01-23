import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { emulatorHost } from "./firebase";

let hasInitFirestore = false;

export function initFirestore() {
	if (hasInitFirestore) return;
	hasInitFirestore = true;

	const firestore = getFirestore();
	if (process.env.NODE_ENV === "development") {
		connectFirestoreEmulator(firestore, emulatorHost, 8080);
	}
}
