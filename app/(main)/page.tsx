"use client";

import { Button } from "@/components/Button";
import { Conditional } from "@/components/Conditional";
import { PageContent } from "@/components/PageContent";
import { QuotaOverview } from "@/components/QuotaOverview";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BatchUpload, BatchUploadContext } from "@/components/batch_upload/BatchUpload";
import { BatchUploadAlert } from "@/components/batch_upload/BatchUploadAlert";
import { BatchUploadProgress } from "@/components/batch_upload/BatchUploadProgress";
import { DropZone } from "@/components/batch_upload/DropZone";
import { UploadArray } from "@/components/batch_upload/UploadArray";
import TextField from "@/components/forms/TextField";
import { createFileDoc } from "@/models/files";
import { Link as LinkObject, MAX_LEN_LINK_TITLE } from "@/models/links";
import { OrderField } from "@/models/order";
import { now } from "@/utils/dates";
import { createViewLink } from "@/utils/files";
import { mergeNames } from "@/utils/mergeNames";
import { quantityString } from "@/utils/quantityString";
import { useAppRouter } from "@/utils/useAppRouter";
import { useFeatures } from "@/utils/useFeatures";
import { Millis } from "@thegoodcompany/common-utils-js";
import { Timestamp, getFirestore, runTransaction } from "firebase/firestore";
import { Formik, FormikProps } from "formik";
import { useEffect, useMemo, useRef, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import AccordionBody from "react-bootstrap/AccordionBody";
import AccordionHeader from "react-bootstrap/AccordionHeader";
import AccordionItem from "react-bootstrap/AccordionItem";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import FormLabel from "react-bootstrap/FormLabel";
import Row from "react-bootstrap/Row";
import * as Yup from "yup";

export const dynamic = "force-static";

function extractTitle(file: File) {
	return file.name.substring(0, MAX_LEN_LINK_TITLE);
}

export default function Page() {
	const router = useAppRouter();
	const features = useFeatures();

	const link = useRef(new LinkObject());
	const [url, setUrl] = useState<string>();

	const formRef = useRef<FormikProps<typeof initValues.current>>(null);
	const [state, setState] = useState<"none" | "uploading" | "processing" | "submitted">("none");

	const [schema, minExpireTimeStr, maxExpireTimeStr] = useMemo(() => {
		let titleSpec = Yup.string();
		let expiresSpec = Yup.date();

		const currentTime = now();
		const maxValidity = features.quotas.links?.validity?.limit || 1209600000; // ? 14days
		const minValidity = 86400000; // 24hrs

		let maxExpireTimeStr: string | undefined;
		if (maxValidity === -1) {
			expiresSpec = expiresSpec.optional();
		} else {
			maxExpireTimeStr = new Date(currentTime + maxValidity).toISOString().split("T")[0];
			const maxValidityDays = new Millis(maxValidity).toDays().value;

			expiresSpec = expiresSpec.required("Expiration time is required.")
				.max(maxExpireTimeStr, `Your current feature tier allows maximum validity of ${maxValidityDays} 
					${quantityString("day", "days", maxValidityDays)}.`);
		}

		const minExpireTimeStr = new Date(currentTime + minValidity).toISOString().split("T")[0];
		const minValidityDays = new Millis(minValidity).toDays().value;

		expiresSpec = expiresSpec.min(minExpireTimeStr, `Must have at least ${minValidityDays} 
			${quantityString("day", "days", minValidityDays)} validity.`);

		titleSpec = titleSpec.optional()
			.max(MAX_LEN_LINK_TITLE, `Link title can't be more than ${MAX_LEN_LINK_TITLE} characters long.`)
			.min(1, "Title must be greater than 1 character long.")
			.trim();

		return [Yup.object({ title: titleSpec, expires: expiresSpec }), minExpireTimeStr, maxExpireTimeStr];
	}, [features.quotas.links?.validity?.limit]);

	// todo: use local cache to set default expire time to infinity for users with such quota available.
	const initValues = useRef({ title: "", expires: maxExpireTimeStr });

	useEffect(() => {
		if (url) router.push(url);
	}, [router, url]);

	return <PageContent>
		<BatchUpload
			link={link.current}
			maxFiles={features.isAvailable("filedocs.write") ? undefined : features.quotas.links?.inlinefids?.limit}
			maxSize={features.quotas.storage?.filesize?.limit}
			method={features.isAvailable("filedocs.write") ? "standalone" : "inline"}
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
						
						const expires = values.expires;
						if (expires) {
							const cDate = new Date();
							const timeOffset = ((cDate.getHours() * 60 + cDate.getMinutes()) * 60 + cDate.getSeconds()) * 1000;

							const expireDate = new Date(expires);
							link.current.setExpireTime(Timestamp.fromMillis(expireDate.getTime() + timeOffset));
						}

						try {
							const value = await runTransaction(getFirestore(), async transaction => {
								const ref = link.current.create(title, transaction);

								ctx.fileDocs.forEach((options, fid) => {
									createFileDoc(fid, options.name, {
										[link.current.ref.id]: { [OrderField.CREATE_ORDER]: options.order }
									}, options.extras, transaction);
								});

								return ref;
							});

							setUrl(createViewLink(value.id));
							setState("submitted");
						} catch (error) {
							console.error(`capture failed [cause: ${error}]`);
							ctx.status.push("files:capture-failed");

							link.current.releaseLock();
							setState("none");
						}
					}}
				>{({ handleSubmit, errors }) => <Form noValidate onSubmit={handleSubmit}>
					<BatchUploadAlert />
					<Row className="g-3" xs={1} lg={3}>
						<Col lg={7}>
							<TextField
								name="title"
								label="Title"
								placeholder="Short but meaningful. When left empty, file name will be used."
								disabled={state === "submitted" || state === "processing"}
							/>
						</Col>
						<Col lg={3}>
							<TextField
								type="date"
								name="expires"
								label="Expire date"
								tooltip="Link will be deleted after this date."
								max={maxExpireTimeStr}
								min={minExpireTimeStr}
								step={1}
								disabled={state === "submitted" || state === "processing"}
							/>
						</Col>
						<Col lg={2}>
							<FormLabel className="invisible d-none d-lg-inline-block">Placeholder</FormLabel>
							<Button
								className="w-100 justify-content-center"
								variant="outline-vivid"
								type="submit"
								state={state === "processing" ? "loading" : "none"}
								disabled={(ctx.files?.length ?? 0) === 0 ||
									state === "uploading" || state === "processing" || state === "submitted" ||
									Object.values(errors).some((v) => !!v)}
							>
								Continue
							</Button>
						</Col>
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
								subtext={"Links expire after validity period"}
								continous
							/>
						</Col>
					</Row>
				</Form>}</Formik>}
			</BatchUploadContext.Consumer>
		</BatchUpload>
		<Accordion className="mt-3">
			<AccordionItem eventKey="quota">
				<AccordionHeader>View usage quota</AccordionHeader>
				<AccordionBody>
					<QuotaOverview quotas={features.quotas} />
				</AccordionBody>
			</AccordionItem>
		</Accordion>
		<ScrollToTop />
	</PageContent>;
}
