import { FirebaseOptions } from "firebase/app";
import { Backblaze, BackblazeConfig } from "./backblaze";

export const EXPIRE_DAYS = 14;

export const firebaseConfig: FirebaseOptions = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getB2Config(): BackblazeConfig {
	const apiUrl = Backblaze.resolveDefaultApiUrl();
	const cred = Backblaze.resolveDefaultCredential();

	return {
		apiUrl: apiUrl,
		authUrl: apiUrl,
		fileUrl: "https://f003.backblazeb2.com/file",
		defaultBucket: process.env.NEXT_PUBLIC_B2_DEFAULT_BUCKET,
		defaultAppKey: cred.key,
		defaultAppKeyId: cred.keyId
	};
}

export const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY_ID || "";
export const appcheckDebugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || "";
