import { get } from "@vercel/edge-config";
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
import { hasWindow } from "./common";
import { appcheckDebugToken, firebaseConfig, siteKey } from "./configs";
import { connectFunctionsEmulator, getFunctions } from "./functions";

export const FIREBASE_APP_NAME = "[DEFAULT]";

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
		
		connectFirestoreEmulator(firestore, "localhost", 8080);
		connectFunctionsEmulator(functions, "localhost", 5001);
		connectAuthEmulator(auth, "http://localhost:9099", {
			disableWarnings: true,
		});
	}

	let appCheckProvider: ReCaptchaEnterpriseProvider | CustomProvider;
	if (hasWindow) {
		console.debug("Using recaptcha enterprise for appcheck purposes.");
		appCheckProvider = new ReCaptchaEnterpriseProvider(siteKey);
	} else {
		appCheckProvider = new CustomProvider({
			getToken: async () => {
				if (process.env.NODE_ENV === "development") {
					console.debug("Using AppCheck debug token");
					return {
						token: appcheckDebugToken,
						expireTimeMillis: new Date().getTime() + 60 * 60 * 1000,
					};
				}

				console.debug("Getting appcheck token from database.");
				const options = await get("appCheck");
				if (!options || typeof options !== "object" || Array.isArray(options)) 
					throw new Error("AppCheck object is malformed or missing from database.");

				const token = options.token;
				const expireTime = options.expireTime;

				if (typeof token !== "string" || typeof expireTime !== "number" || expireTime < new Date().getTime())
					throw new Error("Invalid token or expire time of AppCheck object.");

				return {
					token,
					expireTimeMillis: expireTime,
				};
			}
		});
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
