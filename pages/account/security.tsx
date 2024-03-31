import { NextPage } from "next";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { AccountNavigation } from "../../components/accounts/AccountNavigation";
import { AccountSettings } from "../../components/accounts/AccountSettings";
import React, { useRef, useState } from "react";
import { User } from "firebase/auth";
import { AccountSettingsContainer } from "../../components/accounts/AccountSettingsContainer";
import { WithUser } from "../../components/accounts/WithUser";
import { CardicForm } from "../../components/forms/CardicForm";
import TextField from "../../components/forms/TextField";
import * as yup from "yup";
import { SendCodeButton } from "../../components/SendCodeButton";
import { useToast } from "../../utils/useToast";
import { useStatus } from "../../utils/useStatus";
import {
	AUTH_EMAIL_CONFIRM_OTP_LEN,
	AUTH_SIGN_IN_OTP_LENGTH,
	KEY_EMAIL_TO_UPDATE,
	sendEmailConfirmationLink,
	signInWithLink,
	updateEmail,
} from "../../utils/auths";
import { makeContinueUrl } from "../../utils/urls";
import { Conditional } from "../../components/Conditional";
import { FirebaseError } from "firebase/app";
import { AlertArray, AlertArraySource } from "../../components/AlertArray";
import { Button } from "../../components/Button";

enum EmailUpdateState {
	NONE, CODE_SENT, VERIFYING, UPDATED
}

const emailSchema = yup.object().shape({
	email: yup.string()
		.email("Must be a valid email address")
		.required("Email address is required."),
	code: yup.string()
		.length(AUTH_SIGN_IN_OTP_LENGTH, `The one time password is a ${AUTH_EMAIL_CONFIRM_OTP_LEN} characters long code sent to your email.`)
		.required("The one time code is required.")
});

const statusAlerts: AlertArraySource<Status> = {
	"email:send-code-failed": {
		variant: "danger",
		body: <>There was an error while sending the confirmation code to your email. Please try again after some time.</>,
		dismissible: false,
	},
	"email:invalid-code": {
		variant: "danger",
		body: <>Provided confirmation code is invalid. Please try again.</>,
		dismissible: true,
	},
	"email:code-expired": {
		variant: "danger",
		body: <>Your confirmation code has expired. Please try sending another one.</>,
		dismissible: true,
	},
	"email:error": {
		variant: "danger",
		body: <>There was an error while updating your email. Please try again after some time.</>,
		dismissible: true,
	},
	"email:updated": {
		variant: "success",
		body: <>Email updated successfully.</>,
		dismissible: false,
	},
	"email:reauth-required": {
		variant: "warning",
		body: <>You may need to sign-in again!</>,
		dismissible: false,
	},
	"email:already-exists": {
		variant: "danger",
		body: <>Looks like that the email address is already associated with another account.</>,
		dismissible: false,
	}
};

const Settings: React.FunctionComponent<{ user: User }> = ({
	user,
}) => {
	const { makeToast } = useToast();

	const emailValues = useRef({ email: user.email || "", code: "" });
	const emailErrors = useRef({ email: "x", code: "x" });

	const [emailState, setEmailState] = useState(EmailUpdateState.NONE);

	const { status, appendStatus, removeStatus, setStatus } = useStatus<Status>();

	return <AccountSettingsContainer>
		<AccountNavigation />
		<AccountSettings>
			<h1>Security settings</h1>
			<p>Update your security information.</p>
			<hr />
			<CardicForm
				className={"mt-4"}
				primaryText={"Email address"}
				subsidiaryText={"This is your contact and sign-in address."}
				initialValues={emailValues.current}
				initialErrors={emailErrors.current}
				validationSchema={emailSchema}
				state={emailState === EmailUpdateState.VERIFYING ? "loading" : "none"}
				onSubmit={async (values) => {
					setEmailState(EmailUpdateState.VERIFYING);
					emailValues.current = values;
					emailErrors.current = { email: "", code: "" };

					let signInLink: string | null | undefined;
					try {
						const res = await updateEmail(user.uid, values.email || "", values.code, makeContinueUrl("recover-email", "/"));
						signInLink = res.signInLink;
					} catch (error) {
						console.error("Unable to update user email: ", error);
						switch ((error as FirebaseError)?.code) {
							case "functions/invalid-argument": appendStatus("email:invalid-code"); break;
							case "functions/deadline-exceeded": appendStatus("email:code-expired"); break;
							case "functions/already-exists": appendStatus("email:already-exists"); break;
							default: appendStatus("email:error");
						}

						return setEmailState(EmailUpdateState.CODE_SENT);
					}

					if (signInLink) {
						await signInWithLink(values.email || "", signInLink);
					} else {
						appendStatus("email:reauth-required");
					}

					appendStatus("email:updated");
					setEmailState(EmailUpdateState.UPDATED);
				}}
				onReset={(_, { setFieldValue }) => {
					setEmailState(EmailUpdateState.NONE);
					setStatus(ts => ts.filter(v => !v.startsWith("email")));
					setFieldValue("email", user.email);
					setFieldValue("code", "");
				}}
				preventSubmit={({ values, errors }) => {
					return values.email === user.email ||
						emailState !== EmailUpdateState.CODE_SENT ||
						!!errors.code;
				}}
				actions={({ values, errors, handleReset }) => <>
					<Button
						type={"reset"}
						className={"me-2"}
						variant={"outline-secondary"}
						onClick={handleReset}
						disabled={values.email === user.email || emailState >= EmailUpdateState.VERIFYING}
					>
						Cancel
					</Button>
					<SendCodeButton
						className={"me-2"}
						variant={"outline-secondary"}
						sender={() => sendEmailConfirmationLink(user.uid, values.email || "", makeContinueUrl("update-email"))}
						onSent={() => {
							localStorage.setItem(KEY_EMAIL_TO_UPDATE, values.email || "");

							setEmailState(EmailUpdateState.CODE_SENT);
							makeToast("An email has been sent with confirmation code to " + values.email + ".");
						}}
						onSendFailed={(error) => {
							console.error("Email confirmation link send failed: ", error);
							appendStatus("email:send-code-failed");
						}}
						disabled={values.email === user.email || !values.email || !!errors.email || emailState > EmailUpdateState.CODE_SENT}
					/>
				</>}
			>
				{({ setFieldValue }) => <>
					<TextField
						name={"email"}
						disabled={emailState >= EmailUpdateState.CODE_SENT}
					/>
					<Conditional in={emailState >= EmailUpdateState.CODE_SENT}>
						<TextField
							className={"mt-3"}
							name={"code"}
							label={"Confirmation code"}
							helperText={"Enter the code sent to your email."}
							onChange={(evt) => setFieldValue("code", evt.currentTarget.value.trim())}
							disabled={emailState !== EmailUpdateState.CODE_SENT}
						/>
					</Conditional>
					<AlertArray source={statusAlerts} present={status} onDismiss={removeStatus} />
				</>}
			</CardicForm>
		</AccountSettings>
	</AccountSettingsContainer>;
};

const Security: NextPage = () => {
	return <PageContainer>
		<Header />
		<PageContent>
			<WithUser>
				{(user) => <Settings user={user}/>}
			</WithUser>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Security;

type Status = "email:send-code-failed" |
	"email:invalid-code" |
	"email:code-expired" |
	"email:error" |
	"email:updated" |
	"email:reauth-required" |
	"email:already-exists";
