import { FirebaseError } from "firebase/app";
import { getAdditionalUserInfo } from "firebase/auth";
import { Formik } from "formik";
import React, { useRef, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import {
	AUTH_SIGN_IN_OTP_LENGTH,
	KEY_SIGN_IN_EMAIL,
	obtainSignInLink,
	sendSignInLinkToEmail,
	signInWithLink,
} from "../utils/auths";
import { useStatus } from "../utils/useStatus";
import { useToast } from "../utils/useToast";
import { useUser } from "../utils/useUser";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import TextField from "./forms/TextField";
import { SendCodeButton } from "./SendCodeButton";
import { makeContinueUrl } from "../utils/urls";
import { AlertArray, AlertArraySource } from "./AlertArray";

enum State {
	NONE, CODE_REQUESTED, P1, SENT, SUBMITTED, P2, COMPLETED
}

const schema = yup.object().shape({
	email: yup.string()
		.email("Must be a valid email address")
		.required("Email address is required."),
	code: yup.string()
		.length(AUTH_SIGN_IN_OTP_LENGTH, `The one time password is a ${AUTH_SIGN_IN_OTP_LENGTH} characters long code sent to your email.`)
		.required("One time password is required.")
});

const statusMssgMapping: AlertArraySource<StatusCode> = {
	"err:send-otp-to-email": {
		variant: "danger",
		body: <>There was an error while sending the one time password to your email. Please try again after some time.</>,
		dismissible: true,
	},
	"err:send-sign-in-link-to-email": {
		variant: "danger",
		body: <>There was an error while sending the sign in link to your email. Please try again after some time.</>
	},
	"err:invalid-otp": {
		variant: "danger",
		body: <>Provided one time password is invalid. Please try again.</>,
		dismissible: true,
	},
	"err:otp-expired": {
		variant: "danger",
		body: <>Your one time password is expired. Try sending another one.</>,
		dismissible: true,
	},
	"err:sign-in": {
		variant: "danger",
		body: <>There was an error signing you in. Please try again after some time.</>,
		dismissible: true,
	},
	"signed-in:new-user": {
		variant: "success",
		body: <>Thanks for signing up. You can now close this dialog.</>,
	},
	"signed-in:existing-user": {
		variant: "success",
		body: <>Welcome back. You can now close this dialog.</>,
	},
	"signed-in:user-linked": {
		variant: "success",
		body: <>Your current account has been linked to your email address. You can now close this dialog</>,
	}
};

export const SignInDialog: React.FunctionComponent<SignInDialogProps> = (props) => {
	const { user } = useUser();
	const { makeToast } = useToast();

	const [state, setState] = useState<State>(State.NONE);
	const { status, setStatus, appendStatus, removeStatus } = useStatus<StatusCode>();

	const initValues = useRef({
		email: "",
		code: "",
	});

	const initErrors = useRef({
		email: "x",
		code: "x",
	});

	return <Modal
		backdrop={state === State.COMPLETED ? undefined : "static"}
		fullscreen="md-down"
		keyboard
		aria-label="sign-in form"
		{...props}
	>
		<ModalHeader>
			<ModalTitle>Sign into Get Link</ModalTitle>
		</ModalHeader>
		<Formik
			validationSchema={schema}
			initialValues={initValues.current}
			initialErrors={initErrors.current}
			onSubmit={async (values) => {
				setState(State.P2);
				initValues.current = values;

				let signInLink: string;
				try {
					signInLink = (await obtainSignInLink(values.email, values.code)).data;
				} catch (error) {
					console.error(`failed to obtain sign in link from otp [cause: ${error}]`);
					switch ((error as FirebaseError)?.code) {
						case "functions/invalid-argument": appendStatus("err:invalid-otp"); break;
						case "functions/deadline-exceeded": appendStatus("err:otp-expired"); break;
						default: appendStatus("err:sign-in");
					}
					
					return setState(State.SENT);
				}

				try {
					const cred = await signInWithLink(values.email, signInLink, user);
					if (cred.operationType === "link") appendStatus("signed-in:user-linked");
					else if (getAdditionalUserInfo(cred)?.isNewUser) appendStatus("signed-in:new-user");
					else appendStatus("signed-in:existing-user");

					removeStatus("err:sign-in");
					setState(State.COMPLETED);

					makeToast(`You are signed in as ${cred.user.email}`, "info");
				} catch (error) {
					console.error(`Sign in with link failed [cause: ${error}]`);
					appendStatus("err:sign-in");
					setState(State.SENT);
				}
			}}
			onReset={() => {
				setState(State.NONE);
				setStatus([]);
			}}
		>
			{({ handleSubmit, values, errors, setFieldValue }) => (
				<Form noValidate onSubmit={handleSubmit}>
					<ModalBody>
						<fieldset disabled={[State.P1, State.P2, State.COMPLETED, State.SUBMITTED].includes(state)}>
							<TextField
								name="email"
								label={<>Email address</>}
								disabled={state >= State.CODE_REQUESTED}
							/>
							<Conditional in={state >= State.SENT}>
								<TextField
									className="mt-3"
									name="code"
									label={<>One time password</>}
									helperText="You can also click on the link sent to your email to sign in."
									onChange={(evt) => setFieldValue("code", evt.currentTarget.value.trim())}
									disabled={state !== State.SENT}
								/>
							</Conditional>
						</fieldset>
						<AlertArray source={statusMssgMapping} present={status} onDismiss={removeStatus} />
					</ModalBody>
					<ModalFooter>
						<Button variant="outline-secondary" onClick={props.onHide} disabled={[State.P1, State.P2].includes(state)}>
							{state === State.COMPLETED ? "Close" : "Cancel"}
						</Button>
						<SendCodeButton
							sender={() => sendSignInLinkToEmail(values.email, makeContinueUrl("signin"))}
							onSent={() => {
								setState(c => Math.max(c, State.SENT));
								makeToast(`An email with the one time password has been sent to ${values.email}`, "info");
								
								localStorage.setItem(KEY_SIGN_IN_EMAIL, values.email);
							}}
							onSendFailed={(error) => {
								console.error("Sign in link send failed: ", error);
								appendStatus("err:send-otp-to-email");
							}}
							disabled={!!errors.email || !values.email || state > State.SENT}
						/>
						<Conditional in={state >= State.SENT}>
							<Button
								variant="outline-primary"
								type="submit"
								state={state === State.P2 ? "loading" : "none"}
								disabled={Object.values(errors).some(v => !!v) || state > State.SUBMITTED}
							>
								Sign in
							</Button>
						</Conditional>
					</ModalFooter>
				</Form>
			)}
		</Formik>
	</Modal>;
};

type StatusCode = "err:send-otp-to-email" | 
	"err:send-sign-in-link-to-email" |
	"err:sign-in" | 
	"err:invalid-otp" | 
	"err:otp-expired" |
	"signed-in:existing-user" |
	"signed-in:new-user" |
	"signed-in:user-linked";

export type SignInDialogProps = ModalProps;
