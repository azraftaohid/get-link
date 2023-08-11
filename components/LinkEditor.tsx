import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { Formik } from "formik";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import * as yup from "yup";
import { Link as LinkObj, MAX_LEN_LINK_TITLE, getLinkRef } from "../models/links";
import { useFeatures } from "../utils/useFeatures";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { BatchUploadState, DropZone } from "./batch_upload/DropZone";
import TextField from "./forms/TextField";

const LinkEditor: React.FunctionComponent<LinkEditorProps> = ({
	lid,
	title,
	fileCount,
	isDynamic,
	onUpdated,
	...rest
}) => {
	const link = useRef(new LinkObj(getLinkRef(lid)));

	const { data: user } = useAuthUser(["usr"], getAuth());
	const features = useFeatures(user);

	const [status, setStatus] = useState<"none" | "processing" | "submitted" | "error">("none");
	const [filesState, setFilesState] = useState<BatchUploadState>("none");

	const initValues = useRef({
		title: title,
	});

	const schema = useMemo(() => yup.object().shape({
		title: yup.string()
			.required("Title is required")
			.max(MAX_LEN_LINK_TITLE, `Link title can't be more than ${MAX_LEN_LINK_TITLE} characters long.`)
			.min(1, "Title must be greater than 1 character long.")
			.trim(),
	}), []);

	useEffect(() => {
		if (rest.show) return;
		setStatus("none");
		link.current = new LinkObj(link.current.ref);
	}, [rest.show]);

	return <Modal
		fullscreen="md-down"
		size="lg"
		backdrop={status !== "submitted" ? "static" : undefined}
		keyboard={false}
		aria-labelledby="link title form"
		{...rest}
	>
		<ModalHeader closeButton>
			<ModalTitle>Edit link</ModalTitle>
		</ModalHeader>
		<Formik
			validationSchema={schema}
			initialValues={initValues.current}
			onSubmit={async (values, actions) => {
				setStatus("processing");

				initValues.current = values;
				link.current.setTitle(values.title || "");

				try {
					await link.current.update();
					setStatus("submitted");
					onUpdated?.(values.title || "");
				} catch (error) {
					console.error(`error updating link [lid: ${lid}; cause: ${error}]`);
					setStatus("error");
				}

				actions.setSubmitting(false);
			}}
		>
			{({ handleSubmit, errors }) => (
				<Form noValidate onSubmit={handleSubmit}>
					<ModalBody>
						<TextField
							className="mb-3"
							name="title"
							disabled={status === "processing" || status === "submitted"} 
						/>
						<DropZone
							link={link.current}
							method={isDynamic ? "standalone" : "inline"}
							hint="Add files"
							subtext="Expires when the link is expired"
							maxFiles={isDynamic ? 0 : (features.quotas.links?.inline_fids.limit ?? 0) - fileCount}
							maxSize={features.quotas.storage?.file_size?.limit}
							startPos={fileCount}
							continous
							observer={setFilesState}
							disabled={status === "processing" || status === "submitted"}
						/>
						<Conditional className="mt-3" in={status === "submitted"}>
							<Alert variant="success">
								Submit successful! It may take several minutes for changes to propagate.
							</Alert>
						</Conditional>
						<Conditional className="mt-3" in={status === "error"}>
							<Alert variant="danger">
								Something went wrong while submitting. Please try again later or use the feedback button below to let us know.
							</Alert>
						</Conditional>
					</ModalBody>
					<ModalFooter>
						<Button variant="outline-secondary" onClick={rest.onHide} disabled={status === "processing" || filesState === "processing"}>
							{status === "submitted" ? "Close" : "Cancel"}
						</Button>
						<Button
							variant="outline-primary"
							type="submit"
							state={status === "processing" ? "loading" : "none"}
							disabled={filesState === "processing" || status === "processing" || status === "submitted" || Object.values(errors).some((err) => !!err)}
						>
							Update
						</Button>
					</ModalFooter>
				</Form>
			)}
		</Formik>
	</Modal>;
};

export default LinkEditor;

export interface LinkEditorProps extends ModalProps {
	lid: string,
	fileCount: number,
	title?: string,
	isDynamic?: boolean,
	onUpdated?: (newTitle: string) => unknown,
}
