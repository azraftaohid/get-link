import { FirebaseOptions } from "firebase/app";
import { BackblazeConfig } from "./backblaze";

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

export const b2Config: BackblazeConfig = {
	clusterNo: process.env.NEXT_PUBLIC_BACKBLAZE_CLUSTER_NO || "003",
	defaultBucket: process.env.NEXT_PUBLIC_B2_DEFAULT_BUCKET || "",
};

export const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY_ID || "";
export const appcheckDebugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || "";
