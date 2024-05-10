import { serverTimestamp, WithFieldValue } from "firebase/firestore";
import { Formik } from "formik";
import { usePathname } from "next/navigation";
import React, { useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import { NameField } from "../models/name";
import { captureReport, ReportData, ReportField } from "../models/report";
import { createTicketId } from "../models/tickets";
import { KEY_SID } from "../utils/analytics";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { Link } from "./Link";
import { Required } from "./Required";

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
	const pathname = usePathname();

	const inputState = useRef({
		name: "",
		email: "",
		message: "",
	});

	const [status, setState] = useState<"none" | "processing" | "submitted">("none");
	const [ticketId, setTicketId] = useState<string>();
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

					const newTicketId = createTicketId();
					const data: WithFieldValue<ReportData> = {
						[ReportField.NAME]: { [NameField.SURNAME]: values.name },
						[ReportField.EMAIL]: values.email,
						[ReportField.MESSAGE]: values.message,
						[ReportField.PATH]: pathname || "",
						[ReportField.SESSION]: sessionStorage.getItem(KEY_SID) || "",
						[ReportField.CREATE_TIME]: serverTimestamp(),
						[ReportField.TICKET]: newTicketId,
					};

					try {
						await captureReport(data);
						setTicketId(newTicketId);
						setSubmitError(false);
						setState("submitted");
					} catch (error) {
						console.error(`error capturing report [cause: ${error}]`);
						setSubmitError(true);
						setTicketId(undefined);
						setState("none");
					}

					actions.setSubmitting(false);
				}}
				initialErrors={{
					message: "x",
				}}
			>
				{({ handleSubmit, handleChange, handleBlur, initialValues, touched, errors }) => (
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
									</cite>.
								</p>
								<small className="d-block mb-3">
									<Required /> Required
								</small>
								<FormGroup className="mb-3">
									<FormLabel>Name</FormLabel>
									<FormControl
										type="text"
										name="name"
										placeholder="Keep it empty to report anonymously"
										defaultValue={initialValues.name}
										isInvalid={touched.name && !!errors.name}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
									<FormControl.Feedback type="invalid">{errors.name}</FormControl.Feedback>
								</FormGroup>
								<FormGroup className="mb-3">
									<FormLabel>Email address</FormLabel>
									<FormControl
										type="text"
										name="email"
										placeholder="example@provider.com"
										defaultValue={initialValues.email}
										isInvalid={touched.email && !!errors.email}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
									<FormText>
										We will only use it to get back to you if more information is needed.
									</FormText>
									<FormControl.Feedback type="invalid">{errors.email}</FormControl.Feedback>
								</FormGroup>
								<FormGroup>
									<FormLabel>
										Statement <Required />
									</FormLabel>
									<FormControl
										as="textarea"
										rows={5}
										name="message"
										defaultValue={initialValues.message}
										isInvalid={touched.message && !!errors.message}
										onChange={handleChange}
										onBlur={handleBlur}
										required
									/>
									<FormText>
										Information about currently visiting page will be included automatically.
									</FormText>
									<FormControl.Feedback type="invalid">{errors.message}</FormControl.Feedback>
								</FormGroup>
								<Conditional in={!!ticketId}>
									<Alert className="mt-3" variant="success">
										Thanks, your report has been captured. Please use this ID for future references:{" "}
										<span className="fst-italic">{ticketId}</span>.
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
