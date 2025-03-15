import {
    initializeAnalytics,
    isSupported as isAnalyticsSupported,
    setAnalyticsCollectionEnabled,
    setUserId,
} from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import { AppCheck, CustomProvider, ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
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
import { acquireExperienceOptions } from "./analytics";
import { AppCheckFromEdgeConfigProvider } from "./appcheck/AppCheckFromEdgeConfigProvider";
import { hasWindow } from "./common";
import { appcheckDebugToken, firebaseConfig, siteKey } from "./configs";
import { connectFunctionsEmulator, getFunctions } from "./functions";

export const FIREBASE_APP_NAME = "[DEFAULT]";

export const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost";

let appCheck: AppCheck;

export function requireAppCheck() {
	if (!appCheck) throw new Error("AppCheck instance not found. You must call #initFirebase function first.");
	return appCheck;
}

export function initFirebase() {
	const apps = getApps();
	const currentApp = apps.find((v) => v.name === FIREBASE_APP_NAME);
	if (currentApp) {
		console.debug("Current app found; returning w/o initialization.");
		return currentApp;
	}

	console.debug("Initializing Firebase app.");
	const app = initializeApp(firebaseConfig);

	const firestore = getFirestore(app);
	const functions = getFunctions(app);
	const auth = initializeAuth(app, {
		persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
	});

	if (process.env.NODE_ENV === "development") {
		if (hasWindow) self.FIREBASE_APPCHECK_DEBUG_TOKEN = appcheckDebugToken;
		
		connectFirestoreEmulator(firestore, emulatorHost, 8080);
		connectFunctionsEmulator(functions, emulatorHost, 5001);
		connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
			disableWarnings: true,
		});
	}

	let appCheckProvider: ReCaptchaEnterpriseProvider | CustomProvider;
	if (hasWindow) {
		console.debug("Using recaptcha enterprise for appcheck purposes.");
		appCheckProvider = new ReCaptchaEnterpriseProvider(siteKey);
	} else {
		appCheckProvider = new AppCheckFromEdgeConfigProvider();
	}

	appCheck = initializeAppCheck(app, {
		provider: appCheckProvider,
		isTokenAutoRefreshEnabled: true,
	});

	isAnalyticsSupported().then((bool) => {
		if (!bool) return;

		const instance = initializeAnalytics(app);
		setAnalyticsCollectionEnabled(instance, process.env.NODE_ENV === "production");

		const { eid } = acquireExperienceOptions();
		setUserId(instance, eid, { global: true });
	});

	return app;
}
