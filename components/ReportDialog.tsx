import { Formik } from "formik";
import { useRouter } from "next/router";
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
import Spinner from "react-bootstrap/Spinner";
import * as yup from "yup";
import { NameField } from "../models/name";
import { captureReport, ReportData, ReportField } from "../models/report";
import { KEY_SID } from "../utils/analytics";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { Required } from "./Required";

const schema = yup.object().shape({
	name: yup.string().optional()
		.max(30, "Name must be less than 30 characters long.")
		.min(1, "Name must be greater than 1 character long.")
		.matches(/^[a-z \-.,'/]+$/gi, { message: "Name must not contain any unnecessary punctuations." })
		.trim(),
	email: yup.string().optional()
		.email("This email address doesn't look right."),
	message: yup.string().required("Please enter a description of the problem you are facing.")
		.max(1000, "Please complete your statement in less than a thousand letters."),
});

const ReportDialog: React.FunctionComponent<ReportDialogProps> = (props) => {
	const { asPath } = useRouter();

	const inputState = useRef({
		name: "",
		email: "",
		message: "",
	});
	
	const [status, setState] = useState<"none" | "processing" | "submitted">("none");
	const [submitId, setSubmitId] = useState<string>();
	const [submitError, setSubmitError] = useState(false);

	return <Modal 
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
				message: "x"
			}}
		>
			{({ handleSubmit, handleChange, handleBlur, initialValues, touched, errors }) => (<Form noValidate onSubmit={handleSubmit}>
				<fieldset disabled={status !== "none"}>
					<ModalBody>
						<small className="d-block mb-3"><Required /> Required</small>
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
							<FormControl.Feedback type="invalid">
								{errors.name}
							</FormControl.Feedback>
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
							<FormControl.Feedback type="invalid">
								{errors.email}
							</FormControl.Feedback>
						</FormGroup>
						<FormGroup>
							<FormLabel>Statement <Required /></FormLabel>
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
							<FormControl.Feedback type="invalid">
								{errors.message}
							</FormControl.Feedback>
						</FormGroup>
						<Conditional in={!!submitId}>
							<Alert className="mt-3" variant="success">
								Thanks, your report has been captured. Please use this ID for future references: <span className="fst-italic">
									{submitId}
								</span>.
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
							left={status === "processing" ? <Spinner 
								as="span" 
								role="status" 
								animation="border" 
								size="sm" 
								aria-hidden 
							/> : undefined}
							disabled={Object.values(errors).some(err => !!err)}
						>
							Submit
						</Button>
					</ModalFooter>
				</fieldset>
			</Form>)}
		</Formik>
	</Modal>;
};

export default ReportDialog;

export interface ReportDialogProps extends ModalProps {

}