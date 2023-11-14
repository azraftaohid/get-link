import { get } from "@vercel/edge-config";
import {
	initializeAnalytics,
	isSupported as isAnalyticsSupported,
	setAnalyticsCollectionEnabled,
	setUserId,
} from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import { CustomProvider, ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import {
	browserLocalPersistence,
	browserSessionPersistence,
	connectAuthEmulator,
	indexedDBLocalPersistence,
	initializeAuth,
} from "firebase/auth";
import {
	connectFirestoreEmulator as connectFirestoreLiteEmulator,
	getFirestore as getFirestoreLite,
} from "firebase/firestore/lite";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { acquireExperienceOptions } from "./analytics";
import { hasWindow } from "./common";
import { appcheckDebugToken, firebaseConfig, siteKey } from "./configs";
import { FIREBASE_APP_NAME } from "./firebase";

let hasInit = false;

export function init() {
	if (hasInit) return;
	hasInit = true;

	initFirebase();
}

function initFirebase() {
	const apps = getApps();
	const currentApp = apps.find((v) => v.name === FIREBASE_APP_NAME);
	if (currentApp) return currentApp;

	const app = initializeApp(firebaseConfig);

	const firestore = getFirestoreLite(app);
	const storage = getStorage(app);
	const auth = initializeAuth(app, {
		persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
	});

	if (process.env.NODE_ENV === "development") {
		if (hasWindow) self.FIREBASE_APPCHECK_DEBUG_TOKEN = appcheckDebugToken;
		
		connectFirestoreLiteEmulator(firestore, "localhost", 8080);
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

	let appCheckProvider: ReCaptchaEnterpriseProvider | CustomProvider;
	if (hasWindow) {
		console.debug("Using recaptcha enterprise for appcheck purposes.");
		appCheckProvider = new ReCaptchaEnterpriseProvider(siteKey);
	} else {
		appCheckProvider = new CustomProvider({
			getToken: async () => {
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

	initializeAppCheck(app, {
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
