import { ActionCodeSettings, getAuth, sendSignInLinkToEmail } from "firebase/auth";
import { Formik } from "formik";
import { useRouter } from "next/router";
import React, { useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import { KEY_SIGN_IN_EMAIL } from "../utils/auths";
import { isLocalHost } from "../utils/common";
import { useStatus } from "../utils/useStatus";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { Required } from "./Required";
import TextField from "./forms/TextField";

const schema = yup.object().shape({
	email: yup.string()
		.email("Must be a valid email address")
		.required("Email address is required."),
});

export const SignInDialog: React.FunctionComponent<SignInDialogProps> = (props) => {
	const router = useRouter();

	const [state, setState] = useState<"submitted" | "processing" | "none">("none");
	const { status, setStatus, appendStatus, removeStatus } = useStatus<"err:send-link-to-email">();

	const initValues = useRef({
		email: "",
	});

	const initErrors = useRef({
		email: "x",
	});

	return <Modal
		backdrop={state === "submitted" ? undefined : "static"}
		fullscreen="md-down"
		keyboard
		aria-label="sign-in form"
		{...props}
	>
		<ModalHeader>
			<ModalTitle>Sign in</ModalTitle>
		</ModalHeader>
		<Formik
			validationSchema={schema}
			initialValues={initValues.current}
			initialErrors={initErrors.current}
			onSubmit={async (values) => {
				setState("processing");
				initValues.current = values;

				const actionCodeSettings: ActionCodeSettings = {
					url: `${isLocalHost() ? "http://" : "https://"}${window.location.host}/continue-signin?path=${router.asPath}`,
					handleCodeInApp: true,
				};

				try {
					await sendSignInLinkToEmail(getAuth(), values.email, actionCodeSettings);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					console.error(`error sending sign in link to email [code: ${error.code}; message: ${error.message}]`);
					appendStatus("err:send-link-to-email");
					setState("none");
					return;
				}

				localStorage.setItem(KEY_SIGN_IN_EMAIL, values.email);
				setState("submitted");
				removeStatus("err:send-link-to-email");
			}}
			onReset={() => {
				setState("none");
				setStatus([]);
			}}
		>
			{({ handleSubmit, values, errors }) => (
				<Form noValidate onSubmit={handleSubmit}>
					<ModalBody>
						<fieldset disabled={["submitted", "processing"].includes(state)}>
							<TextField
								name="email"
								label={<>Email address <Required /></>}
							/>
						</fieldset>
						<Conditional in={state === "submitted"}>
							<Alert className="mt-3 mb-0" variant="success">
								An email with the sign in link has been sent to <span className="fst-italic">{values.email}</span>.
							</Alert>
						</Conditional>
						<Conditional in={status.includes("err:send-link-to-email")}>
							<Alert className="mt-3 mb-0" variant="danger" onClose={() => removeStatus("err:send-link-to-email")} dismissible>
								There was an error while sending the sign in link via email. Please try again after some time.
							</Alert>
						</Conditional>
					</ModalBody>
					<ModalFooter>
						<Button variant="outline-secondary" onClick={props.onHide} disabled={state === "processing"}>
							{state === "submitted" ? "Close" : "Cancel"}
						</Button>
						<Button
							variant="outline-primary"
							type="submit"
							state={state === "processing" ? "loading" : "none"}
							disabled={Object.values(errors).some(v => !!v) || state === "processing" || state === "submitted"}
						>
							Get sign in link
						</Button>
					</ModalFooter>
				</Form>
			)}
		</Formik>
	</Modal>;
};

export type SignInDialogProps = ModalProps;
