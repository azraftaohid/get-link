import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { Formik, FormikProps } from "formik";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import * as Yup from "yup";
import { Button } from "../components/Button";
import { Conditional } from "../components/Conditional";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { QuotaOverview } from "../components/QuotaOverview";
import { BatchUpload, BatchUploadContext } from "../components/batch_upload/BatchUpload";
import { BatchUploadAlert } from "../components/batch_upload/BatchUploadAlert";
import { BatchUploadProgress } from "../components/batch_upload/BatchUploadProgress";
import { DropZone } from "../components/batch_upload/DropZone";
import { UploadArray } from "../components/batch_upload/UploadArray";
import TextField from "../components/forms/TextField";
import { Link as LinkObject, MAX_LEN_LINK_TITLE } from "../models/links";
import {
	createViewLink
} from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { useFeatures } from "../utils/useFeatures";

const schema = Yup.object({
	title: Yup.string()
		.optional()
		.max(MAX_LEN_LINK_TITLE, `Link title can't be more than ${MAX_LEN_LINK_TITLE} characters long.`)
		.min(1, "Title must be greater than 1 character long.")
		.trim(),
});

function extractTitle(file: File) {
	return file.name.substring(0, MAX_LEN_LINK_TITLE);
}

const Home: NextPage = () => {
	const router = useRouter();

	const { data: user } = useAuthUser(["usr"], getAuth());
	const features = useFeatures(user);

	const link = useRef(new LinkObject());
	const [url, setUrl] = useState<string>();

	const initValues = useRef({ title: "" });

	const formRef = useRef<FormikProps<typeof initValues.current>>(null);

	const [state, setState] = useState<"none" | "uploading" | "processing" | "submitted">("none");

	useEffect(() => {
		if (url) router.push(url);
	}, [router, url]);

	return (
		<PageContainer>
			<Metadata title="Get Link" image="https://getlink.vercel.app/image/cover.png" />
			<Header />
			<PageContent>
				<BatchUpload
					link={link.current}
					maxFiles={features.isAvailable("storage.documents.write") ? 0 : features.quotas.links?.inline_fids.limit}
					maxSize={features.quotas.storage?.file_size?.limit}
					observer={(state) => {
						if (state === "processing") setState("uploading");
					}}
					onCompleted={(files) => {
						setState("none");

						const leadFile = files[0];
						if (leadFile && !formRef.current?.values.title) {
							formRef.current?.setFieldValue("title", extractTitle(leadFile));
						}
					}}
					disabled={state === "submitted" || state === "processing"}
				>
					<BatchUploadContext.Consumer>
						{(ctx) => <Formik
							innerRef={formRef}
							validationSchema={schema}
							initialValues={initValues.current}
							onSubmit={async (values, actions) => {
								setState("processing");

								let title = values.title;
								if (!title) {
									title = ctx.files?.[0] && extractTitle(ctx.files[0]);
									if (!title) throw new Error("could not determine title of the link");

									actions.setFieldValue("title", title, false);
								}

								link.current.create(title).then(value => {
									setUrl(createViewLink(value.id));
									setState("submitted");
								}).catch(err => {
									console.error(`capture failed [cause: ${err}]`);
									ctx.status.push("files:capture-failed");

									setState("none");
								});

								actions.setSubmitting(false);
							}}
						>{({ handleSubmit, errors }) => <Form noValidate onSubmit={handleSubmit}>
							<BatchUploadAlert />
							<Row className="g-3" xs={1} md={2}>
								<Col md={10}><TextField
									className="me-auto"
									name="title"
									label="Title"
									placeholder="Short but meaningful. When left empty, file name will be used."
									disabled={state === "submitted" || state === "processing"}
								/></Col>
								<Col className="align-self-end" md={2}><Button
									className="w-100 justify-content-center"
									variant="outline-vivid"
									type="submit"
									state={state === "processing" ? "loading" : "none"}
									disabled={(ctx.files?.length ?? 0) === 0 ||
										state === "uploading" || state === "processing" || state === "submitted" ||
										Object.values(errors).some((v) => !!v)}
								>
									Continue
								</Button></Col>
							</Row>
							<hr />
							<BatchUploadProgress redirectUrl={url} />
							<Row xs={1} md={2}>
								<Col>
									<Conditional in={ctx.files.length > 0}>
										<UploadArray />
									</Conditional>
								</Col>
								<Col md={ctx.files.length === 0 && 12}>
									<DropZone
										className={mergeNames(ctx.files.length > 0 && "mt-3 mt-md-0 h-25 h-md-100 mh-md-unset")}
										continous
									/>
								</Col>
							</Row>
						</Form>}</Formik>}
					</BatchUploadContext.Consumer>
				</BatchUpload>
				<Accordion className="mt-3">
					<Accordion.Item eventKey="quota">
						<Accordion.Header>View usage quota</Accordion.Header>
						<Accordion.Body>
							<QuotaOverview quotas={features.quotas} />
						</Accordion.Body>
					</Accordion.Item>
				</Accordion>
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export default Home;
