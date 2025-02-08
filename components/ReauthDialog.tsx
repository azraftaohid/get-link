import { LoginFailureReason, logReauth, logReauthFailure } from "@/utils/analytics";
import { FirebaseError } from "firebase/app";
import { User } from "firebase/auth";
import { Formik } from "formik";
import React, { useRef, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import { AUTH_REAUTH_OTP_LEN, clearAuthAttempt, obtainReauthLink, reauthWithLink, registerAuthAttempt, sendReauthLink } from "../utils/auths";
import { makeContinueUrl } from "../utils/urls";
import { useStatus } from "../utils/useStatus";
import { useToast } from "../utils/useToast";
import { AlertArray, AlertArraySource } from "./AlertArray";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import TextField from "./forms/TextField";
import { SendCodeButton } from "./SendCodeButton";

enum State {
	NONE, CODE_SENT, VERIFYING, COMPLETED
}

const statusAlerts: AlertArraySource<Status> = {
	"error:send-code": {
		variant: "danger",
		body: <>There was an error while sending the one time password to your email. Please try again after some time.</>,
		dismissible: false,
	},
	"error:invalid-code": {
		variant: "danger",
		body: <>Provided one time password is invalid. Please try again.</>,
		dismissible: true,
	},
	"error:code-expired": {
		variant: "danger",
		body: <>Your one time password has expired. Please try sending another one.</>,
		dismissible: true,
	},
	"error:reauth": {
		variant: "danger",
		body: <>There was an error while re-authenticating you. Please try again after some time.</>,
		dismissible: true,
	},
	"success:reauth": {
		variant: "success",
		body: <>Re-authentication completed.</>,
		dismissible: false,
	},
};

const schema = yup.object().shape({
	code: yup.string()
		.length(AUTH_REAUTH_OTP_LEN, `The one time password is a ${AUTH_REAUTH_OTP_LEN} characters long code sent to your email.`)
		.required("One time password is required.")
});

export const ReauthDialog: React.FunctionComponent<ReauthDialogProps> = ({
	user,
	onComplete,
	...rest
}) => {
	const { makeToast } = useToast();
	const [state, setState] = useState(State.NONE);
	const { status, setStatus, appendStatus, removeStatus } = useStatus<Status>();

	const initValues = useRef({ email: user.email, code: "" });
	const initErrors = useRef({ email: "", code: "x" });

	return <Modal
		backdrop={state === State.COMPLETED ? undefined : "static"}
		fullscreen="md-down"
		keyboard
		aria-label="reauthentication form"
		{...rest}
	>
		<ModalHeader className={"d-flex flex-column align-items-start"}>
			<ModalTitle>Reauthenticate</ModalTitle>
			<p className={"mb-0"}>Please verify your identity first.</p>
		</ModalHeader>
		<Formik
			validationSchema={schema}
			initialValues={initValues.current}
			initialErrors={initErrors.current}
			onSubmit={async (values) => {
				setState(State.VERIFYING);
				initValues.current = values;
				initErrors.current = { email: "", code: "" };

				const attempts = registerAuthAttempt("reauth", "emailOtp");

				let reauthLink: string;
				try {
					reauthLink = (await obtainReauthLink(user.uid, values.code)).data;
				} catch (error) {
					console.error("Failed to obtain reauth link from OTP: ", error);

					let failureReason: LoginFailureReason;
					switch ((error as FirebaseError)?.code) {
						case "functions/invalid-argument": 
							appendStatus("error:invalid-code");
							failureReason = "invalid_otp";
							break;
						case "functions/deadline-exceeded": 
							appendStatus("error:code-expired");
							failureReason = "otp_expired";
							break;
						default: 
							appendStatus("error:reauth");
							failureReason = "undetermined";
					}

					logReauthFailure("email_otp", attempts, failureReason);
					return setState(State.CODE_SENT);
				}

				try {
					await reauthWithLink(user, reauthLink);
				} catch (error) {
					console.error("Reauth with link failed: ", error);
					appendStatus("error:reauth");

					logReauthFailure("email_otp", attempts, "unexpected");
					return setState(State.CODE_SENT);
				}

				setState(State.COMPLETED);
				appendStatus("success:reauth");

				makeToast("You are successfully re-authenticated!", "info");

				logReauth("email_otp", attempts);
				clearAuthAttempt("reauth");

				onComplete?.();
			}}
			onReset={() => {
				setState(State.NONE);
				setStatus([]);
			}}
		>
			{({ values, setFieldValue, handleSubmit, errors }) => <Form noValidate onSubmit={handleSubmit}>
				<ModalBody>
					<TextField
						name={"email"}
						label={"Email address"}
						value={user.email}
						disabled
					/>
					<Conditional in={state >= State.CODE_SENT}>
						<TextField
							className={"mt-3"}
							name={"code"}
							label={"Verification code"}
							helperText={"Enter the code sent to your email."}
							onChange={(evt) => setFieldValue("code", evt.currentTarget.value.trim())}
							disabled={state !== State.CODE_SENT}
						/>
					</Conditional>
					<AlertArray source={statusAlerts} present={status} onDismiss={removeStatus} />
				</ModalBody>
				<ModalFooter>
					<Button
						type={"reset"}
						variant={"outline-secondary"}
						onClick={rest.onHide}
						disabled={state === State.VERIFYING}
					>
						{state === State.COMPLETED ? "Close" : "Cancel"}
					</Button>
					<SendCodeButton
						sender={() => sendReauthLink(user.uid, makeContinueUrl("reauth"))}
						onSent={() => {
							setState(c => Math.max(c, State.CODE_SENT));
							makeToast("An email with the one time password has been sent to " + user.email + ".");
						}}
						onSendFailed={(error) => {
							console.error("Reauth link send failed: ", error);
							appendStatus("error:send-code");
						}}
						disabled={!values.email || !!errors.email || state > State.CODE_SENT}
					/>
					<Conditional in={state >= State.CODE_SENT} direction={"horizontal"}>
						<Button
							type={"submit"}
							variant={"outline-primary"}
							state={state === State.VERIFYING ? "loading" : "none"}
							disabled={state !== State.CODE_SENT || Object.values(errors).some(v => !!v)}
						>
							Verify
						</Button>
					</Conditional>
				</ModalFooter>
			</Form>}
		</Formik>
	</Modal>;
};

export type UserWithEmail = User & { email: NonNullable<User["email"]> };

type Status = "error:send-code" |
	"error:invalid-code" |
	"error:code-expired" |
	"error:reauth" |
	"success:reauth";

export interface ReauthDialogProps extends ModalProps {
	user: UserWithEmail,
	onComplete?: () => unknown,
}
