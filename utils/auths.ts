import { HttpsCallable, httpsCallable } from "firebase/functions";
import { getFunctions } from "./functions";

export const KEY_SIGN_IN_EMAIL = "passwordless_sign_in.last_email";

let authSendOtpToEmailFunc: HttpsCallable<EmailOTPRequestData, void>;
let authVerifyEmailOtpFunc: HttpsCallable<EmailOTPSignInRequestData, string>;

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

export type AuthStatus = "auth:sign-in-error" |
	"auth:signing-in";

interface EmailOTPRequestData {
	email: string
	continueUrl?: string,
}

interface EmailOTPSignInRequestData {
	email: string,
	otp: string,
	linkCurrentUser?: boolean,
}
