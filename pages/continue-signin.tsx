import { getAdditionalUserInfo, getAuth, onAuthStateChanged } from "firebase/auth";
import { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import { Conditional } from "../components/Conditional";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Loading } from "../components/Loading";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { KEY_SIGN_IN_EMAIL, signInWithLink } from "../utils/auths";
import { useToast } from "../utils/useToast";

const signInMessages: Partial<Record<State, React.ReactNode>> = {
	"existing-user": <>Welcome back. Please wait while we are redirect you&hellip;</>,
	"new-user": <>Thanks for signing up. Please wait while we redirect you&hellip;</>,
	"user-linked": <>Your current account has been linked with this account. Please wait while we are redirecting you.</>,
};

const ContinueSignIn: NextPage = () => {
	const router = useRouter();
	const { makeToast } = useToast();

	const [state, setState] = useState<State>("none");

	const ran = useRef(false);

	useEffect(() => {
		if (!router.isReady || ran.current) return;
		ran.current = true;

		const redirPath = typeof router.query.path === "string" && router.query.path || "/";

		const email = localStorage.getItem(KEY_SIGN_IN_EMAIL) || window.prompt("Please re-enter your email address.");
		if (!email) return setState("failed");

		const auth = getAuth();
		let trigg = 0;
		const unsubscribeAuthState = onAuthStateChanged(auth, user => {
			if (trigg > 0) return;
			trigg++;

			signInWithLink(email, window.location.href, user).then(cred => {
				unsubscribeAuthState();
				localStorage.removeItem(KEY_SIGN_IN_EMAIL);
	
				makeToast(`You are signed in as ${email}`, "info");

				if (cred.operationType === "link") setState("user-linked");
				else if (getAdditionalUserInfo(cred)?.isNewUser) setState("new-user");
				else setState("existing-user");

				router.push(redirPath);
			}).catch(error => {
				console.error(`sign in with link failed [cause: ${error}]`);
				setState("failed");
			});
		}, err => {
			console.error(`error subscribing to auth state [cause: ${err}]`);
			setState("failed");
		});

		return unsubscribeAuthState;
	}, [makeToast, router]);

	return <PageContainer>
		<Header />
		<PageContent>
			{state === "none" && <Loading />}
			<Conditional in={Object.keys(signInMessages).includes(state)}>
				<Alert variant="success">
					{signInMessages[state]}
				</Alert>
			</Conditional>
			<Conditional in={state === "failed"}>
				<Alert variant="danger">
					Something is wrong with your request. Please check the url for any errors.
				</Alert>
			</Conditional>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default ContinueSignIn;

type State = "failed" | "new-user" | "existing-user" | "user-linked" | "none";
