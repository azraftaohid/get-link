import { FirebaseApp } from "firebase/app";
import {
	browserLocalPersistence,
	browserSessionPersistence,
	connectAuthEmulator,
	EmailAuthProvider,
	fetchSignInMethodsForEmail,
	getAuth,
	indexedDBLocalPersistence,
	initializeAuth,
	isSignInWithEmailLink,
	linkWithCredential,
	reauthenticateWithCredential,
	signInWithEmailLink,
	User,
	UserCredential,
} from "firebase/auth";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { now } from "./dates";
import { AppError } from "./errors/AppError";
import { emulatorHost } from "./firebase";
import { getFunctions } from "./functions";

export const KEY_SIGN_IN_EMAIL = "passwordless_sign_in.last_email";
export const KEY_EMAIL_TO_UPDATE = "email_update.last_email";

const KEY_SIGN_IN_ATTEMPT_COUNT = "sign_in.attempt_count";
const KEY_LAST_SIGN_IN_ATTEMPT_TIME = "sign_in.last_attempt_time";

export const signInMethods = ["emailLink", "emailOtp"] as const;

export const AUTH_SIGN_IN_OTP_LENGTH = +(process.env.NEXT_PUBLIC_SIGN_IN_OTP_LEN || process.env.NEXT_PUBLIC_OTP_LEN || 15);
export const AUTH_REAUTH_OTP_LEN = +(process.env.NEXT_PUBLIC_REAUTH_OTP_LEN || AUTH_SIGN_IN_OTP_LENGTH);
export const AUTH_EMAIL_CONFIRM_OTP_LEN = +(process.env.NEXT_PUBLIC_EMAIL_CONFIRM_OTP_LEN || AUTH_SIGN_IN_OTP_LENGTH);

let authSendSignInLinkToEmailFunc: HttpsCallable<EmailSignInLinkRequestData, void>;
let authObtainSignInLinkFunc: HttpsCallable<ObtainSignInLinkRequestData, string>;
let authSendOtpToEmailFunc: HttpsCallable<EmailOTPRequestData, void>;
let authVerifyEmailOtpFunc: HttpsCallable<EmailOTPSignInRequestData, string>;
let authSendReauthLinkFunc: HttpsCallable<EmailReauthLinkRequestData, void>;
let authObtainReauthLinkFunc: HttpsCallable<ObtainReauthLinkRequestData, string>;
let authEmailConfirmationLinkFunc: HttpsCallable<EmailConfirmationLinkRequestData, void>;
let authUpdateEmailFunc: HttpsCallable<UpdateEmailRequestData, UpdateEmailResponseData>;
let authRecoverEmailFunc: HttpsCallable<EmailRecoveryRequestData, EmailRecoveryResponseData>;

let hasInit = false;

export function initAuth(app: FirebaseApp) {
	if (hasInit) return getAuth(app);
	hasInit = true;
	
	const auth = initializeAuth(app, {
		persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
	});

	if (process.env.NODE_ENV === "development") {
		connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
			disableWarnings: true,
		});
	}

	return auth;
}

export async function sendEmailConfirmationLink(uid: string, newEmail: string, redirectUrl: string) {
	if (!authEmailConfirmationLinkFunc)
		authEmailConfirmationLinkFunc = httpsCallable(getFunctions(), "auth-sendemailconfirmationlink");

	await authEmailConfirmationLinkFunc({ uid, redirectUrl, email: newEmail });
}

export async function updateEmail(uid: string, newEmail: string, otp: string, recoverUrl: string) {
	if (!authUpdateEmailFunc)
		authUpdateEmailFunc = httpsCallable(getFunctions(), "auth-updateemail");

	return (await authUpdateEmailFunc({ uid, otp, recoverUrl, email: newEmail })).data || { };
}

export async function recoverEmail(oobCode: string, redirectUrl: string) {
	if (!authRecoverEmailFunc)
		authRecoverEmailFunc = httpsCallable(getFunctions(), "auth-recoveremail");

	return (await authRecoverEmailFunc({ oobCode, redirectUrl })).data || { };
}

export async function sendReauthLink(uid: string, redirectUrl: string) {
	if (!authSendReauthLinkFunc)
		authSendReauthLinkFunc = httpsCallable(getFunctions(), "auth-sendreauthlinktoemail");

	await authSendReauthLinkFunc({ uid, redirectUrl });
}

export async function obtainReauthLink(uid: string, vcode: string) {
	if (!authObtainReauthLinkFunc)
		authObtainReauthLinkFunc = httpsCallable(getFunctions(), "auth-obtainreauthlink");

	return await authObtainReauthLinkFunc({ uid, otp: vcode });
}

export async function sendSignInLinkToEmail(email: string, redirectUrl: string) {
	if (!authSendSignInLinkToEmailFunc) 
		authSendSignInLinkToEmailFunc = httpsCallable(getFunctions(), "auth-sendsigninlinktoemail");
	
	await authSendSignInLinkToEmailFunc({ email, redirectUrl });
}

export async function obtainSignInLink(email: string, otp: string) {
	if (!authObtainSignInLinkFunc) 
		authObtainSignInLinkFunc = httpsCallable(getFunctions(), "auth-obtainsigninlink");
	
	return authObtainSignInLinkFunc({ email, otp });
}

export async function sendOtpToEmail(email: string, continueUrl?: string) {
	if (!authSendOtpToEmailFunc) 
		authSendOtpToEmailFunc = httpsCallable(getFunctions(), "auth-sendotptoemail");

	await authSendOtpToEmailFunc({ email, continueUrl });
}

export async function verifyEmailOtp(email: string, otp: string, linkCurrentUser: boolean) {
	if (!authVerifyEmailOtpFunc) 
		authVerifyEmailOtpFunc = httpsCallable(getFunctions(), "auth-verifyemailotp");
	
	return await authVerifyEmailOtpFunc({
		email, otp, linkCurrentUser,
	});
}

export async function reauthWithLink(user: User & { email: NonNullable<User["email"]> }, reauthLink: string) {
	const auth = getAuth();
	if (!isSignInWithEmailLink(auth, reauthLink)) {
		throw new AppError("reauth/invalid-link", "Provided reauth link is not valid.");
	}

	const authCred = EmailAuthProvider.credentialWithLink(user.email, reauthLink);
	return await reauthenticateWithCredential(user, authCred);
}

export async function signInWithLink(email: string, signInLink: string, currentUser?: User | null): Promise<UserCredential> {
	const auth = getAuth();
	if (!isSignInWithEmailLink(auth, signInLink)) {
		throw new AppError("sign-in/invalid-link", "Provided sign in link is not valid.");
	}

	const postSignInOp = () => {
		localStorage.removeItem(KEY_SIGN_IN_EMAIL);
	};

	const attemptAsNewSignIn = async () => {
		console.debug("attempting as new sign-in");
		try {
			const result = await signInWithEmailLink(auth, email, signInLink);
			postSignInOp();

			return result;
		} catch (error) {
			throw new AppError("sign-in/with-email-link", `Sign in with link failed: ${error}`);
		}
	};

	const attemptToLink = async (currentUser: User) => {
		console.debug("attempting to link user");
		const authCred = EmailAuthProvider.credentialWithLink(email, signInLink);

		try {
			const cred = await linkWithCredential(currentUser, authCred);
			postSignInOp();

			return cred;
		} catch (error) {
			throw new AppError("sign-in/link-error", `Annymous user link failed: ${error}`);
		}
	};

	if (!currentUser?.isAnonymous) return await attemptAsNewSignIn();

	let signInMethods: string[];
	try {
		signInMethods = await fetchSignInMethodsForEmail(getAuth(), email);
	} catch (error) {
		throw new AppError("sign-in/fetch-methods", `Fetch sign in methods failed: ${error}`);
	}

	if (signInMethods.length === 0) return await attemptToLink(currentUser);
	else return await attemptAsNewSignIn();
}

export function registerAuthAttempt(authType: "login" | "reauth" | "updateEmail" | "recoverEmail", method: typeof signInMethods[number]) {
	const cTime = now();
	const lastAttemptTime = +(localStorage.getItem(authType + "." + KEY_LAST_SIGN_IN_ATTEMPT_TIME) || "0");
	const timeDiff = cTime - lastAttemptTime;

	const attempts: Omit<SignInAttempts, "accumulated"> = {
		emailLink: 0,
		emailOtp: 0,
	};

	let accumulated = 0;
	for (const m of signInMethods) {
		const scopedKey = authType + "." + KEY_SIGN_IN_ATTEMPT_COUNT + "." + m;
		let scopedAttempt = 0;

		if (timeDiff < 86400000) scopedAttempt = +(localStorage.getItem(scopedKey) || "0");
		if (m === method) scopedAttempt++;

		attempts[method] = scopedAttempt;
		accumulated += scopedAttempt;
		localStorage.setItem(scopedKey, scopedAttempt.toString());
	}

	localStorage.setItem(authType + "." + KEY_LAST_SIGN_IN_ATTEMPT_TIME, cTime.toString());

	return {
		accumulated,
		...attempts,
	};
}

export function clearAuthAttempt(authType: "login" | "reauth" | "updateEmail" | "recoverEmail") {
	localStorage.removeItem(authType + "." + KEY_LAST_SIGN_IN_ATTEMPT_TIME);
	for (const m of signInMethods) {
		localStorage.removeItem(authType + "." + KEY_SIGN_IN_ATTEMPT_COUNT + "." + m);
	}
}

export type AuthStatus = "auth:sign-in-error" |
	"auth:signing-in";

interface EmailConfirmationLinkRequestData {
	uid: string,
	email: string,
	redirectUrl: string,
}

interface UpdateEmailRequestData {
	uid: string,
	email: string,
	otp: string,
	recoverUrl: string,
}

interface UpdateEmailResponseData {
	signInLink?: string | null,
}

interface EmailRecoveryRequestData {
	oobCode: string,
	redirectUrl: string,
}

interface EmailRecoveryResponseData {
	uid?: string | null,
	email?: string | null,
	signInLink?: string | null,
}

interface EmailReauthLinkRequestData {
	uid: string,
	redirectUrl: string,
}

interface ObtainReauthLinkRequestData {
	uid?: string,
	otp?: string,
}

interface EmailSignInLinkRequestData {
	email: string,
	redirectUrl: string,
}

interface ObtainSignInLinkRequestData {
	email?: string,
	otp?: string,
}

interface EmailOTPRequestData {
	email: string
	continueUrl?: string,
}

interface EmailOTPSignInRequestData {
	email: string,
	otp: string,
	linkCurrentUser?: boolean,
}

export type SignInAttempts = Record<typeof signInMethods[number] | "accumulated", number>;
