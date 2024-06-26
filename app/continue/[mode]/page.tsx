"use client";

import { Conditional } from "@/components/Conditional";
import { Loading } from "@/components/Loading";
import { UserWithEmail } from "@/components/ReauthDialog";
import { KEY_EMAIL_TO_UPDATE, KEY_SIGN_IN_EMAIL, reauthWithLink, recoverEmail, signInWithLink, updateEmail } from "@/utils/auths";
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
					const email = localStorage.getItem(KEY_SIGN_IN_EMAIL) || window.prompt("Please re-enter your email address.");
					if (!email) return setState("failed");

					console.debug("Signing in with email link");
					signInWithLink(email, window.location.href, user).then(cred => {
						localStorage.removeItem(KEY_SIGN_IN_EMAIL);

						makeToast(`You are signed in as ${email}`, "info");

						if (cred.operationType === "link") setState("user-linked");
						else if (getAdditionalUserInfo(cred)?.isNewUser) setState("new-user");
						else setState("existing-user");

						router.push(redirPath);
					}).catch(error => {
						console.error("Sign in with link failed: ", error);
						setState("failed");
					});
					break;
				}
				case "reauth": {
					if (!user) return setState("require-signed-in");

					const email = user.email;
					if (!email) return setState("failed");

					reauthWithLink(user as UserWithEmail, window.location.href).then(() => {
						makeToast("You're successfully verified as " + email, "info");

						setState("reauthenticated");
						router.push(redirPath);
					}).catch(error => {
						console.error("Reauth with link failed: ", error);
						setState("failed");
					});
					break;
				}
				case "update-email": {
					if (!user) return setState("require-signed-in");

					const email = localStorage.getItem(KEY_EMAIL_TO_UPDATE) || window.prompt("Please re-enter your new email address.");
					if (!email) return setState("failed");

					const url = new URL(window.location.href);
					const otp = url.searchParams.get("otp");

					if (!otp) {
						console.error("URL can not be decoded.");
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
						router.push(redirPath);
					}).catch((error) => {
						console.error("Email update with link failed: ", error);
						if ((error as FirebaseError)?.code === "functions/already-exists") {
							setState("email-already-exists");
						} else {
							setState("failed");
						}
					});
					break;
				}
				case "recover-email": {
					const url = new URL(window.location.href);
					const oobCode = url.searchParams.get("oobCode");

					if (!oobCode) {
						console.error("URL can not be decoded.");
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
						router.push(redirPath);
					}).catch(error => {
						console.error("Email recovery with link failed: ", error);
						if ((error as FirebaseError)?.code === "functions/already-exists") {
							setState("email-already-exists");
						} else {
							setState("failed");
						}
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
