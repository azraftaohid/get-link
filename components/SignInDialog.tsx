import { useAuthUser } from "@react-query-firebase/auth";
import { FirebaseError } from "firebase/app";
import { getAdditionalUserInfo, getAuth } from "firebase/auth";
import { Formik } from "formik";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import { KEY_SIGN_IN_EMAIL, obtainSignInLink, sendSignInLinkToEmail, signInWithLink } from "../utils/auths";
import { isLocalHost } from "../utils/common";
import { useStatus } from "../utils/useStatus";
import { useToast } from "../utils/useToast";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import TextField from "./forms/TextField";

enum State {
	NONE, CODE_REQUESTED, P1, SENT, SUBMITTED, P2, COMPLETED
}

const otpLen = +(process.env.NEXT_PUBLIC_OTP_LEN || 15);

const schema = yup.object().shape({
	email: yup.string()
		.email("Must be a valid email address")
		.required("Email address is required."),
	code: yup.string()
		.length(otpLen, `The one time password is a ${otpLen} characters long code sent to your email.`)
		.required("One time password is required.")
});

const statusMssgMapping: Record<StatusCode, { variant: string, mssg: React.ReactNode, dismissable?: boolean }> = {
	"err:send-otp-to-email": {
		variant: "danger",
		mssg: <>There was an error while sending the one time password to your email. Please try again after some time.</>,
		dismissable: true,
	},
	"err:send-sign-in-link-to-email": {
		variant: "danger",
		mssg: <>There was an error while sending the sign in link to your email. Please try again after some time.</>
	},
	"err:invalid-otp": {
		variant: "danger",
		mssg: <>Provided one time password is invalid. Please try again.</>,
		dismissable: true,
	},
	"err:otp-expired": {
		variant: "danger",
		mssg: <>Your one time password is expired. Try sending another one.</>,
		dismissable: true,
	},
	"err:sign-in": {
		variant: "danger",
		mssg: <>There was an error signing you in. Please try again after some time.</>,
		dismissable: true,
	},
	"signed-in:new-user": {
		variant: "success",
		mssg: <>Thanks for signing up. You can now close this dialog.</>,
	},
	"signed-in:existing-user": {
		variant: "success",
		mssg: <>Welcome back. You can now close this dialog.</>,
	},
	"signed-in:user-linked": {
		variant: "success",
		mssg: <>Your current account has been linked to your email address. You can now close this dialog</>,
	}
};

const SendSignInLinkEmailButton: React.FunctionComponent<SendOtpToEmailButtonProps> = ({
	onSent,
	onSendFailed,
	email,
	error,
	disabled
}) => {
	const router = useRouter();

	const [resendCountdown, setResendCountdown] = useState(0);
	const [state, setState] = useState<"none" | "sending" | "sent">("none");

	useEffect(() => {
		setTimeout(() => setResendCountdown(c => Math.max(0, c - 1)), 1000);
	}, [resendCountdown]);

	return <Button
		variant={state === "none" ? "outline-primary" : "outline-secondary"}
		state={state === "sending" ? "loading" : "none"}
		disabled={!email || !!error || resendCountdown > 0 || disabled}
		onClick={async () => {
			if (!email || error) return console.debug("Not eligible to send OTP.");

			setState("sending");
			try {
				await sendSignInLinkToEmail(email, `${isLocalHost() ? "http://" : "https://"}${window.location.host}/continue-signin?path=${router.asPath}`);
				setState("sent");
				setResendCountdown(60);

				onSent?.();
			} catch (error) {
				console.error(`Failed to send OTP to email [email: ${email}; cause: ${error}]`);
				setState("none");

				onSendFailed?.();
			}
		}}
	>
		{(() => {switch (state) {
			case "none":
				return "Send code";
			case "sending":
				return "Sending";
			default:
				return `Resend${resendCountdown > 0 ? ` (${resendCountdown}s)` : ""}`;
		}})()}
	</Button>;
};

export const SignInDialog: React.FunctionComponent<SignInDialogProps> = (props) => {
	const { data: user } = useAuthUser(["usr"], getAuth());
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
						{(Object.keys(statusMssgMapping) as StatusCode[]).map(key => <Conditional key={key} in={status.includes(key)}>
							<Alert 
								className="mt-3 mb-0" 
								variant={statusMssgMapping[key].variant}
								onClose={() => removeStatus(key)}
								dismissible={statusMssgMapping[key].dismissable}
							>
								{statusMssgMapping[key].mssg}
							</Alert>
						</Conditional>)}
					</ModalBody>
					<ModalFooter>
						<Button variant="outline-secondary" onClick={props.onHide} disabled={[State.P1, State.P2].includes(state)}>
							{state === State.COMPLETED ? "Close" : "Cancel"}
						</Button>
						<SendSignInLinkEmailButton
							email={values.email}
							error={errors.email}
							onSent={() => {
								setState(c => Math.max(c, State.SENT));
								makeToast(`An email with the one time password has been sent to ${values.email}`, "info");
								
								localStorage.setItem(KEY_SIGN_IN_EMAIL, values.email);
							}}
							onSendFailed={() => appendStatus("err:send-otp-to-email")}
							disabled={state > State.SENT}
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

interface SendOtpToEmailButtonProps {
	onSent?: () => unknown,
	onSendFailed?: () => unknown,
	email?: string,
	error?: string,
	disabled?: boolean,
}
