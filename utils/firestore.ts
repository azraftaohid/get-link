import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

let hasInitFirestore = false;

export function initFirestore() {
	if (hasInitFirestore) return;
	hasInitFirestore = true;

	const firestore = getFirestore();
	if (process.env.NODE_ENV === "development") {
		connectFirestoreEmulator(firestore, "localhost", 8080);
	}
}