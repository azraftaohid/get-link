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
import { NameField } from "../models/name";
import { ReportData, ReportField, captureReport } from "../models/report";
import { KEY_SID } from "../utils/analytics";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { Link } from "./Link";
import { Required } from "./Required";
import TextField from "./forms/TextField";

const schema = yup.object().shape({
	name: yup
		.string()
		.optional()
		.max(30, "Name must be less than 30 characters long.")
		.min(1, "Name must be greater than 1 character long.")
		.matches(/^[a-z \-.,'/]+$/gi, { message: "Name must not contain any unnecessary punctuations." })
		.trim(),
	email: yup.string().optional().email("This email address doesn't look right."),
	message: yup
		.string()
		.required("Please enter a description of the problem you are facing.")
		.max(1000, "Please complete your statement in less than a thousand letters."),
});

const ReportDialog: React.FunctionComponent<React.PropsWithChildren<ReportDialogProps>> = (props) => {
	const { asPath } = useRouter();

	const inputState = useRef({
		name: "",
		email: "",
		message: "",
	});

	const [status, setState] = useState<"none" | "processing" | "submitted">("none");
	const [submitId, setSubmitId] = useState<string>();
	const [submitError, setSubmitError] = useState(false);

	return (
		<Modal
			fullscreen="md-down"
			size="xl"
			backdrop={status !== "submitted" ? "static" : undefined}
			keyboard={false}
			aria-labelledby="report form"
			{...props}
		>
			<ModalHeader closeButton>
				<ModalTitle>Report a problem</ModalTitle>
			</ModalHeader>
			<Formik
				validationSchema={schema}
				initialValues={inputState.current}
				onSubmit={async (values, actions) => {
					console.debug("submitting form");
					setState("processing");

					inputState.current = values;
					const data: ReportData = {
						[ReportField.NAME]: { [NameField.SURNAME]: values.name },
						[ReportField.EMAIL]: values.email,
						[ReportField.MESSAGE]: values.message,
						[ReportField.PATH]: asPath,
						[ReportField.SESSION]: sessionStorage.getItem(KEY_SID) || "",
					};

					try {
						const id = await captureReport(data);
						setSubmitId(id);
						setSubmitError(false);
						setState("submitted");
					} catch (error) {
						console.error(`error capturing report [cause: ${error}]`);
						setSubmitError(true);
						setSubmitId(undefined);
						setState("none");
					}

					actions.setSubmitting(false);
				}}
				initialErrors={{
					message: "x",
				}}
			>
				{({ handleSubmit, errors }) => (
					<Form noValidate onSubmit={handleSubmit}>
						<fieldset disabled={status !== "none"}>
							<ModalBody>
								<p>
									Prefer direct messaging? Our twitter handle is{" "}
									<Link href="https://twitter.com/getlinksoft" newTab>
										@getlinksoft
									</Link>
									. Or you can also{" "}
									<Link href="https://m.me/getlinksoft" newTab>
										message us
									</Link>{" "}
									on{" "}
									<cite title="Facebook is an American online social media and social networking service owned by Meta Platforms.">
										Facebook
									</cite>
									.
								</p>
								<small className="d-block mb-3">
									<Required /> Required
								</small>
								<TextField 
									className="mb-3" 
									name="name"
									label="Name"
									placeholder="Keep it empty to report anonymously"
								/>
								<TextField
									className="mb-3"
									name="email"
									label="Email address"
									placeholder="example@provider.com"
								/>
								<TextField
									as="textarea"
									rows={5}
									name="message"
									label={<>Statement <Required /></>}
									helperText="Information about currently visiting page will be included automatically."
									required
								/>
								<Conditional in={!!submitId}>
									<Alert className="mt-3" variant="success">
										Thanks, your report has been captured. Please use this ID for future references:{" "}
										<span className="fst-italic">{submitId}</span>.
									</Alert>
								</Conditional>
								<Conditional in={submitError}>
									<Alert className="mt-3" variant="danger">
										There was an error while submitting your report. Please try again later.
									</Alert>
								</Conditional>
							</ModalBody>
							<ModalFooter>
								<Button variant="outline-secondary" onClick={props.onHide}>
									Cancel
								</Button>
								<Button
									variant="outline-primary"
									type="submit"
									state={status === "processing" ? "loading" : "none"}
									disabled={Object.values(errors).some((err) => !!err)}
								>
									Submit
								</Button>
							</ModalFooter>
						</fieldset>
					</Form>
				)}
			</Formik>
		</Modal>
	);
};

export default ReportDialog;

export interface ReportDialogProps extends ModalProps {}
