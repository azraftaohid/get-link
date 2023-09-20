import {
	initializeAnalytics,
	isSupported as isAnalyticsSupported,
	setAnalyticsCollectionEnabled,
	setUserId,
} from "firebase/analytics";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
	Auth,
	browserLocalPersistence,
	browserSessionPersistence,
	connectAuthEmulator,
	indexedDBLocalPersistence,
	initializeAuth,
} from "firebase/auth";
import {
	Firestore,
	connectFirestoreEmulator,
	getFirestore
} from "firebase/firestore";
import { FirebaseStorage, connectStorageEmulator, getStorage } from "firebase/storage";
import { acquireExperienceOptions } from "./analytics";
import { firebaseConfig } from "./configs";
import { FIREBASE_APP_NAME } from "./firebase";

let hasInit = false;

export function init() {
	if (hasInit) return;
	hasInit = true;

	initFirebase();
}

export function initFirebase() {
	const apps = getApps();
	const currentApp = apps.find((v) => v.name === FIREBASE_APP_NAME);
	if (currentApp) return currentApp;

	const app = initializeApp(firebaseConfig);
	initFirebaseComponents(app);

	return app;
}

export function initFirebaseComponents(app: FirebaseApp): [Auth, Firestore, FirebaseStorage] {

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
	} else if (process.env.NODE_ENV === "production") {
		const noOp = () => {
			/* no-op */
		};
		console.debug = noOp;
		console.log = noOp;
	}

	isAnalyticsSupported().then((bool) => {
		if (!bool) return;

		const instance = initializeAnalytics(app);
		setAnalyticsCollectionEnabled(instance, process.env.NODE_ENV === "production");

		const { eid } = acquireExperienceOptions();
		setUserId(instance, eid, { global: true });
	});

	return [auth, firestore, storage];
}
