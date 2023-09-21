import {
	initializeAnalytics,
	isSupported as isAnalyticsSupported,
	setAnalyticsCollectionEnabled,
	setUserId,
} from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import {
	browserLocalPersistence,
	browserSessionPersistence,
	connectAuthEmulator,
	indexedDBLocalPersistence,
	initializeAuth,
} from "firebase/auth";
import {
	connectFirestoreEmulator,
	getFirestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { acquireExperienceOptions } from "./analytics";
import { firebaseConfig } from "./configs";

export const FIREBASE_APP_NAME = "[DEFAULT]";

export function initFirebase() {
	const apps = getApps();
	const currentApp = apps.find((v) => v.name === FIREBASE_APP_NAME);
	if (currentApp) return currentApp;

	const app = initializeApp(firebaseConfig);

	const firestore = getFirestore(app);
	const storage = getStorage(app);
	const auth = initializeAuth(app, {
		persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
	});

	if (process.env.NODE_ENV === "development") {
		connectFirestoreEmulator(firestore, "localhost", 8080);
		connectStorageEmulator(storage, "localhost", 9199);
		connectAuthEmulator(auth, "http://localhost:9099", {
			disableWarnings: true,
		});
	}

	isAnalyticsSupported().then((bool) => {
		if (!bool) return;

		const instance = initializeAnalytics(app);
		setAnalyticsCollectionEnabled(instance, process.env.NODE_ENV === "production");

		const { eid } = acquireExperienceOptions();
		setUserId(instance, eid, { global: true });
	});

	return app;
}
