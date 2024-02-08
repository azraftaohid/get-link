import { EmailAuthProvider, User, UserCredential, fetchSignInMethodsForEmail, getAuth, isSignInWithEmailLink, linkWithCredential, signInWithEmailLink } from "firebase/auth";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { AppError } from "./errors/AppError";
import { getFunctions } from "./functions";

export const KEY_SIGN_IN_EMAIL = "passwordless_sign_in.last_email";

let authSendSignInLinkToEmailFunc: HttpsCallable<EmailSignInLinkRequestData, void>;
let authObtainSignInLinkFunc: HttpsCallable<ObtainSignInLinkRequestData, string>;
let authSendOtpToEmailFunc: HttpsCallable<EmailOTPRequestData, void>;
let authVerifyEmailOtpFunc: HttpsCallable<EmailOTPSignInRequestData, string>;

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

export type AuthStatus = "auth:sign-in-error" |
	"auth:signing-in";

interface EmailSignInLinkRequestData {
	email?: string,
	redirectUrl?: string,
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
