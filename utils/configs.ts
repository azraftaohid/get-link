import { FirebaseOptions } from "firebase/app";
import { StorageConfig } from "./storage";

export const FLAG_OFFLINE = true;

export const firebaseConfig: FirebaseOptions = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const storageConfig: StorageConfig = {
	apiUrl: process.env.NEXT_PUBLIC_STORAGE_API_URL || "",
	fileUrl: process.env.NEXT_PUBLIC_STORAGE_FILE_URL || "",
	defaultBucket: process.env.NEXT_PUBLIC_STORAGE_DEFAULT_BUCKET || "",
};

export const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY_ID || "";
export const appcheckDebugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || "";

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL_ADDRESS || "";

export const enableUpgrade = process.env.NEXT_PUBLIC_ENABLE_TIER_UPGRADE === "true";
