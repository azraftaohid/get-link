"use client";

import { Conditional } from "@/components/Conditional";
import { Loading } from "@/components/Loading";
import { UserWithEmail } from "@/components/ReauthDialog";
import { EmailRecoverFailureReason, EmailUpdateFailureReason, logEmailRecover, logEmailRecoverFailed, LoginType, logLogin, logLoginFailure, logReauth, logReauthFailure, logUpdateEmail, logUpdateEmailFailure } from "@/utils/analytics";
import { clearAuthAttempt, KEY_EMAIL_TO_UPDATE, KEY_SIGN_IN_EMAIL, reauthWithLink, recoverEmail, registerAuthAttempt, signInWithLink, updateEmail } from "@/utils/auths";
import { makeContinueUrl } from "@/utils/urls";
import { useAppRouter } from "@/utils/useAppRouter";
import { useToast } from "@/utils/useToast";
import { FirebaseError } from "firebase/app";
import { getAdditionalUserInfo, getAuth, onAuthStateChanged } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-bootstrap";

const completeMessage: Partial<Record<State, { variant?: string, body: React.ReactNode }>> = {
	"existing-user": {
		body: <>Welcome back. Please wait while we are redirect you&hellip;</>,
	},
	"new-user": {
		body: <>Thanks for signing up. Please wait while we redirect you&hellip;</>,
	},
	"user-linked": {
		body: <>Your current account has been linked with this account. Please wait while we are redirecting you.</>,
	},
	"reauthenticated": {
		body: <>Thanks for verifying your identity.</>,
	},
	"failed": {
		variant: "danger",
		body: <>Something is wrong with your request. Please check the url for any errors.</>,
	},
	"unknown-mode": {
		variant: "danger",
		body: <>Invalid continuation slug. Check the URL for mistakes.</>,
	},
	"email-updated": {
		body: <>Your sign-in email update is successful.</>,
	},
	"email-recovered": {
		body: <>We&apos;ve successfully recovered your sign-in email.</>,
	},
	"email-already-exists": {
		variant: "danger",
		body: <>It appears that the email address is already associated with another account.</>,
	},
	"require-signed-in": {
		variant: "danger",
		body: <>You must be signed-in. Make sure that you are using the <b>same browser</b> (on the <b>same device</b>) before continuing.</>,
	}
};

export default function Page({ params }: Readonly<{ params: { mode: string } }>) {
	const router = useAppRouter();
	const search = useSearchParams();
	const { makeToast } = useToast();

	const [state, setState] = useState<State>("none");

	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		ran.current = true;

		const auth = getAuth();

		const mode = params.mode;
		const path = search?.get("path");
		const redirPath = typeof path === "string" ? decodeURIComponent(path) : "/";

		const unsubscribeAuthState = onAuthStateChanged(auth, user => {
			unsubscribeAuthState();

			switch (mode) {
				case "signin": {
					const attempts = registerAuthAttempt("login", "emailLink");

					const email = localStorage.getItem(KEY_SIGN_IN_EMAIL) || window.prompt("Please re-enter your email address.");
					if (!email) {
						logLoginFailure("email_link", attempts, "no_email");
						return setState("failed");
					}

					let loginType: LoginType;
					let userLinked = false;

					console.debug("Signing in with email link");
					signInWithLink(email, window.location.href, user).then(cred => {
						localStorage.removeItem(KEY_SIGN_IN_EMAIL);

						makeToast(`You are signed in as ${email}`, "info");

						if (cred.operationType === "link") {
							setState("user-linked");
							loginType = "sign_up";
							userLinked = true;
						} else if (getAdditionalUserInfo(cred)?.isNewUser) {
							setState("new-user");
							loginType = "sign_up";
						} else {
							setState("existing-user");
							loginType = "sign_in";
						}

						logLogin("email_link", loginType, userLinked, attempts);
						clearAuthAttempt("login");
						router.push(redirPath);
					}).catch(error => {
						console.error("Sign in with link failed: ", error);
						setState("failed");

						logLoginFailure("email_link", attempts, "undetermined");
					});
					break;
				}
				case "reauth": {
					const attempts = registerAuthAttempt("reauth", "emailLink");
					
					if (!user) {
						logReauthFailure("email_link", attempts, "no_user");
						return setState("require-signed-in");
					}

					const email = user.email;
					if (!email) {
						logReauthFailure("email_link", attempts, "no_email");
						return setState("failed");
					}

					reauthWithLink(user as UserWithEmail, window.location.href).then(() => {
						makeToast("You're successfully verified as " + email, "info");
						setState("reauthenticated");

						logReauth("email_link", attempts);
						clearAuthAttempt("reauth");
						router.push(redirPath);
					}).catch(error => {
						console.error("Reauth with link failed: ", error);
						setState("failed");

						logReauthFailure("email_link", attempts, "undetermined");
					});
					break;
				}
				case "update-email": {
					const attempts = registerAuthAttempt("updateEmail", "emailLink");

					if (!user) {
						logUpdateEmailFailure("email_link", attempts, "no_user");
						return setState("require-signed-in");
					}

					const email = localStorage.getItem(KEY_EMAIL_TO_UPDATE) || window.prompt("Please re-enter your new email address.");
					if (!email) {
						logUpdateEmailFailure("email_link", attempts, "no_new_email");
						return setState("failed");
					}

					const url = new URL(window.location.href);
					const otp = url.searchParams.get("otp");

					if (!otp) {
						console.error("URL can not be decoded.");
						logUpdateEmailFailure("email_link", attempts, "no_otp");
						return setState("failed");
					}

					updateEmail(user.uid, email, otp, makeContinueUrl("recover-email", "/")).then(async ({ signInLink }) => {
						try {
							if (!signInLink) throw new Error("Sign in link not found.");

							await signInWithLink(email, signInLink);
							makeToast("Your email address is updated to " + email, "info");
						} catch (error) {
							makeToast("Your email address is updated to " + email + ". You may need to sign-in again.", "info");
						}

						setState("email-updated");

						logUpdateEmail("email_link", attempts);
						clearAuthAttempt("updateEmail");
						router.push(redirPath);
					}).catch((error) => {
						console.error("Email update with link failed: ", error);

						let failureReason: EmailUpdateFailureReason;
						if ((error as FirebaseError)?.code === "functions/already-exists") {
							setState("email-already-exists");
							failureReason = "email_already_exists";
						} else {
							setState("failed");
							failureReason = "undetermined";
						}

						logUpdateEmailFailure("email_link", attempts, failureReason);
					});
					break;
				}
				case "recover-email": {
					const attempts = registerAuthAttempt("recoverEmail", "emailLink");

					const url = new URL(window.location.href);
					const oobCode = url.searchParams.get("oobCode");

					if (!oobCode) {
						console.error("URL can not be decoded.");
						logEmailRecoverFailed("email_link", attempts, "no_oob_code");
						return setState("failed");
					}

					recoverEmail(oobCode, window.location.origin).then(async ({ uid, email, signInLink }) => {
						if (uid && user?.uid === uid) {
							try {
								if (!signInLink || !email) throw new Error("Sign in link or new email not found.");
								await signInWithLink(email, signInLink);

								makeToast("Your email address is updated to " + email, "info");
							} catch (error) {
								console.error("Unable to reauth: ", error);
								makeToast(`Your email address is updated${email ? ` to ${email}` : ""}. You may need to sign-in again.`, "warning");
							}
						} else {
							makeToast(`Your email address is updated${email ? ` to ${email}` : ""}.`, "info");
						}

						setState("email-recovered");

						logEmailRecover("email_link", attempts);
						clearAuthAttempt("recoverEmail");
						router.push(redirPath);
					}).catch(error => {
						console.error("Email recovery with link failed: ", error);

						let failureReason: EmailRecoverFailureReason;
						if ((error as FirebaseError)?.code === "functions/already-exists") {
							setState("email-already-exists");
							failureReason = "email_already_exists";
						} else {
							setState("failed");
							failureReason = "undetermined";
						}

						logEmailRecoverFailed("email_link", attempts, failureReason);
					});
					break;
				}
				default: {
					return setState("unknown-mode");
				}
			}
		}, err => {
			console.error("Error subscribing to auth state: ", err);
			setState("failed");
		});
	});

	return <>
		{state === "none" && <Loading />}
		<Conditional in={Object.keys(completeMessage).includes(state)}>
			<Alert variant={completeMessage[state]?.variant || "success"}>
				{completeMessage[state]?.body}
			</Alert>
		</Conditional>
	</>;
}

type State = "unknown-mode" |
	"failed" |
	"email-already-exists" |
	"new-user" |
	"existing-user" |
	"user-linked" |
	"reauthenticated" |
	"none" |
	"require-signed-in" |
	"email-updated" |
	"email-recovered";
