import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import FormLabel from "react-bootstrap/FormLabel";
import Stack from "react-bootstrap/Stack";
import { DropzoneOptions, useDropzone } from "react-dropzone";
import { Conditional } from "../components/Conditional";
import { FileUpload, FileUploadProps } from "../components/FileUpload";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { Link as LinkObject, MAX_LEN_LINK_TITLE } from "../models/links";
import styles from "../styles/home.module.scss";
import { StatusCode } from "../utils/common";
import {
	acceptedFileFormats, createViewLink
} from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { useFeatures } from "../utils/useFeatures";
import { useParallelTracker } from "../utils/useParallelTracker";
import { useProgressTracker } from "../utils/useProgressTracker";
import { useStatus } from "../utils/useStatus";
import { useToast } from "../utils/useToast";

const MAX_CONCURRENT_UPLOAD = 3;

const Home: NextPage = () => {
	const router = useRouter();
	const { makeToast } = useToast();
	const { data: user } = useAuthUser(["user"], getAuth());
	const features = useFeatures();

	const {
		keys: files, setKeys: setFiles,
		markCompleted, markCancelled, markFailed,
		completedCount, failedCount, cancelledCount,
	} = useProgressTracker<File>([]);
	const parallels = useParallelTracker(files, MAX_CONCURRENT_UPLOAD);

	const link = useRef(new LinkObject());
	const [url, setUrl] = useState<string>();

	const { status, setStatus, appendStatus, removeStatus } = useStatus<StatusCode>();

	const triggerChooser = router.query.open_chooser;

	const handleUploadCompleted: FileUploadProps["onComplete"] = (file, fid) => {
		if (!link.current.getCover()) link.current.setCover({ fid });
		
		markCompleted(file);
		parallels.markCompleted(file);
	};
	const handleUploadCancelled: FileUploadProps["onCancel"] = file => { markCancelled(file); parallels.markPaused(file); };
	const handleUploadError: FileUploadProps["onError"] = (file, err) => {
		console.error(`error uploading file: ${err}`);
		markFailed(file);
		parallels.markPaused(file);
	};

	const handleDrop = useCallback<NonNullable<DropzoneOptions["onDrop"]>>(
		(dropped, rejects) => {
			if (rejects.length) {
				let errMssg: string;
				if (rejects.length === 1 && rejects[0].errors.length === 1) {
					const err = rejects[0].errors[0];
					errMssg = `Upload cancelled: ${err.code}`;
					console.debug(`actual type: ${rejects[0].file.type}`);
				} else {
					errMssg = `Upload cancelled for the following files\n${rejects
						.map((reject) => {
							return `${reject.file.name}: ${reject.errors.map((err) => err.code).join(", ")}`;
						})
						.join("\n")}`;
				}

				makeToast(errMssg, "error");
				return;
			}

			const pTracker = new Map<File, boolean>();
			dropped.forEach(value => pTracker.set(value, false));

			setFiles(dropped);
		},
		[makeToast, setFiles]
	);

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		accept: acceptedFileFormats,
		onDrop: handleDrop,
		maxFiles: features.quotas.links?.inline_fids.limit || 5,
		maxSize: features.quotas.storage?.file_size?.limit || 100 * 1024 * 1024 - 1,
		multiple: false,
	});

	const uid = user?.uid;
	useEffect(() => {
		if (!files.length) return;
		if (!uid) {
			console.debug("signing in user anonymously");
			signInAnonymously(getAuth()).catch((err) => {
				console.error(`error signing in user [cause: ${err}]`);
				appendStatus("auth:sign-in-error");
			});
		}
	}, [appendStatus, files.length, uid]);

	useEffect(() => {
		if (url) router.push(url);
	}, [router, url]);

	useEffect(() => {
		if (triggerChooser !== "true") return;

		console.debug("manually trigger to open picker");
		open();
	}, [triggerChooser, open]);

	// capture link when file count is equal to complete + cancel count
	// and some other criteria
	useEffect(() => {
		const leadFile = files[0];
		if (uid && leadFile && files.length === (completedCount + cancelledCount)) {
			const title = leadFile.name.substring(0, MAX_LEN_LINK_TITLE);
			link.current.create(title).then(value => {
				setUrl(createViewLink(value.id));
				setStatus(["page:redirecting"]);
			}).catch(err => {
				console.error(`capture failed [cause: ${err}]`);
				appendStatus("links:create-failed");
			});
		}
	}, [appendStatus, cancelledCount, completedCount, files, setStatus, uid]);

	useEffect(() => {
		if (cancelledCount) appendStatus("files:upload-cancelled");
		if (failedCount) appendStatus("files:upload-failed");
	}, [appendStatus, cancelledCount, failedCount]);

	return (
		<PageContainer>
			<Metadata title="Get Link" image="https://getlink.vercel.app/image/cover.png" />
			<Header />
			<PageContent>
				<Conditional in={status.includes("files:upload-cancelled")}>
					<Alert variant="warning" dismissible onClose={() => removeStatus("files:upload-cancelled")}>
						Some or all of your uploads were cancelled.
					</Alert>
				</Conditional>
				<Conditional
					in={status.some((s) =>
						(
							[
								"files:unknown-error",
								"files:capture-error",
								"files:upload-error",
								"auth:sign-in-error",
								"files:too-large",
								"links:create-failed"
							] as StatusCode[]
						).includes(s)
					)}
				>
					<Alert variant="danger">
						There were some errors for some or all of your files. Please try again!
						<br />
						Code:{" "}
						{status.map((s, i, arr) => (
							<>
								<Link
									key={s}
									className="alert-link"
									href={`/technical#${encodeURIComponent(s)}`}
									newTab
								>
									{s}
								</Link>
								{i < arr.length - 1 && ", "}
							</>
						))}
						.
					</Alert>
				</Conditional>
				<Conditional in={files.length > 0}>
					{status.includes("page:redirecting") 
						? <><Link variant="reset" href={url || "#"}>Redirecting&hellip;</Link></> 
						: <FormLabel aria-label="file-upload-progress">Uploading ({completedCount}/{files.length - cancelledCount})</FormLabel>}
				</Conditional>
				<Stack direction="vertical" gap={3}>
					{files.map((file, i) => <FileUpload
						key={`${file.name}-${i}`}
						link={link.current}
						file={file}
						position={i}
						resume={parallels.shouldRun(file)}
						onComplete={handleUploadCompleted}
						onCancel={handleUploadCancelled}
						onError={handleUploadError}
					/>)}
				</Stack>
				<Conditional in={files.length === 0}>
					<button
						{...getRootProps({
							id: "upload-area",
							type: "button",
							className: mergeNames(
								styles.uploadArea,
								"btn btn-outline-secondary",
								isDragActive && "active"
							),
						})}
					>
						<input {...getInputProps()} />
						<Icon name="file_upload" size="lg" />
						<p className="fs-5 mb-0">{!isDragActive ? "Upload file" : "Drop to upload"}</p>
						<small className="text-mute">(Expires after 14 days)</small>
					</button>
				</Conditional>
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export default Home;
