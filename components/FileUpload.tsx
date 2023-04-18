import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import { UploadMetadata, UploadTask, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { nanoid } from "nanoid";
import React, { useEffect, useRef, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Dimension, DimensionField } from "../models/dimension";
import { FileField, createFID, createFileDoc, getFileRef } from "../models/files";
import { Link as LinkObject } from "../models/links";
import { FileCustomMetadata, FilesStatus, getFileType, getImageDimension, getPdfDimension, getVideoDimension } from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { useFeatures } from "../utils/useFeatures";
import { generateThumbnailFromVideo } from "../utils/video";
import { FilePreview, FilePreviewProps } from "./FilePreview";
import Link from "./Link";

const statusMessages: Partial<Record<FilesStatus, React.ReactNode>> = {
	"files:capture-completed": <>Please wait&hellip;</>,
	"files:capture-failed": <Link href={`/technical#${encodeURIComponent("files:upload-error")}`}>
		files:upload-error
	</Link>,
	"files:creating-doc": "Storing metadata.",
	"files:creating-thumbnail": "Creating thumbnail.",
	"files:created-doc": "Metadata stored.",
	"files:unknown-error": "Something went wrong.",
};

const StatusIndicator: React.FunctionComponent<StatusIndicatorProps> = ({
	className,
	variant = "muted",
	children,
	...rest
}) => {
	return <small className={mergeNames(`text-${variant}`, className)} {...rest}>
		{children}
	</small>;
};

export const FileUpload: React.FunctionComponent<FileUploadProps> = ({
	file,
	link,
	position = 0,
	resume,
	onComplete,
	onCancel,
	onError,
	...rest
}) => {

	const user = useAuthUser(["usr"], getAuth());
	const uid = user.data?.uid;

	const features = useFeatures();

	const [status, setStatus] = useState<FilesStatus>();

	const handleComplete = useRef(onComplete);
	handleComplete.current = onComplete;

	const cancel = useRef(onCancel);
	cancel.current = onCancel;

	const handleError = useRef(onError);
	handleError.current = onError;

	const [control, setControl] = useState<UploadTask>();

	const [progress, setProgress] = useState(0);

	// stateless function: assiciateWithLink; binds the uploaded file provided link
	const _associateWithLink = async (fid: string, file: File) => {
		if (!link) return;

		if (features.isAvailable("storage.documents.write")) {
			setStatus("files:creating-doc");

			const doc = await createFileDoc(fid, file.name, [link.ref.id], { [FileField.POSITION]: position });
			console.debug(`file mirror doc created at ${doc.path}`);

			setStatus("files:created-doc");
			return doc.id;
		} else {
			link.pushFile(fid, { [FileField.POSITION]: position });
			return undefined;
		}
	};
	const associateWithLink = useRef(_associateWithLink);
	associateWithLink.current = _associateWithLink;

	// attempts to upload file, whenever uid or file reference has changed
	useEffect(() => {
		if (!file) return;
		if (!uid) {
			signInAnonymously(getAuth()).catch((err) => {
				console.error(`error signing in user [cause: ${err}]`);
				setStatus("files:upload-failed");
				handleError.current?.(err, file);
			});

			return;
		};

		const task = (async () => {
			const [mime, ext] = await getFileType(file); // respect user specified extension
			console.debug(`mime: ${mime}; ext: ${ext}`);

			const prefix = nanoid(12);
			const fid = createFID(prefix + ext, uid);
			const ref = getFileRef(fid);
			const metadata: UploadMetadata = { contentType: mime };

			// sets metadata: height, width
			// create and uploads video thumbnail
			try {
				let localUrl: string | undefined;
				let dimension: Dimension | undefined;

				if (mime?.startsWith("image")) {
					localUrl = URL.createObjectURL(file);
					dimension = await getImageDimension(localUrl);
				} else if (mime?.startsWith("video")) {
					localUrl = URL.createObjectURL(file);
					dimension = await getVideoDimension(localUrl);

					setStatus("files:creating-thumbnail");
					try {
						const thumbnail = await generateThumbnailFromVideo(localUrl, "image/png");
						if (thumbnail) {
							await uploadBytes(getFileRef(createFID(prefix + ".png", uid)), thumbnail, {
								contentType: "image/png",
								customMetadata: {
									width: dimension[DimensionField.WIDTH],
									height: dimension[DimensionField.HEIGHT],
								} as FileCustomMetadata,
							});
						} else {
							console.warn("skipping to generate video thumbnail");
						}
					} catch (error) {
						console.error(`error generating thumbnail from video [cause: ${error}]`);
					}
					setStatus(undefined);
				} else if (mime === "application/pdf") {
					localUrl = URL.createObjectURL(file);
					dimension = await getPdfDimension(localUrl);
				}

				if (localUrl) URL.revokeObjectURL(localUrl);
				if (dimension) {
					metadata.customMetadata = {
						width: dimension[DimensionField.WIDTH],
						height: dimension[DimensionField.HEIGHT],
					} as FileCustomMetadata;
				}
			} catch (error) {
				console.error(`error getting dimension from selected file [cause: ${error}]`);
			}

			const upload = uploadBytesResumable(ref, file, metadata);
			setControl(upload);

			const unsubscribe = upload.on(
				"state_changed",
				async (snapshot) => {
					setProgress(Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
				},
				(err) => {
					if (err.code === "storage/canceled") {
						console.info("upload cancelled");
						setStatus("files:upload-cancelled");
						cancel.current?.(file);
					} else {
						setStatus("files:upload-failed");
						handleError.current?.(file, err);
					}

					setProgress(0);
				},
				async () => {
					try {
						const docId = await associateWithLink.current(fid, file);
						setStatus("files:capture-completed");
						handleComplete.current?.(file, fid, docId);
					} catch (error) {
						setStatus("files:capture-failed");
						handleError.current?.(file, error);
					}
				}
			);

			return { upload, unsubscribe };
		})();

		return () => {
			task.then(({ upload, unsubscribe }) => {
				if (upload.snapshot.state === "running" || upload.snapshot.state === "paused") {
					upload.snapshot.task.cancel();
					cancel.current?.(file);
				}

				unsubscribe();
			});
		};
	}, [file, uid]);

	useEffect(() => {
		if (resume) control?.resume();
		else control?.pause();
	}, [control, resume]);

	return <FilePreview {...rest}>
		<ProgressBar id="file-upload-progress" animated now={progress} />
		{file ? <StatusIndicator>{status ? statusMessages[status] : `${progress}% completed.`}</StatusIndicator>
			: <StatusIndicator variant="danger">
				Aborted.
			</StatusIndicator>}
	</FilePreview>;
};

interface StatusIndicatorProps extends React.PropsWithChildren<React.HTMLAttributes<HTMLElement>> {
	variant?: "muted" | "danger" | "warning",
}

export interface FileUploadProps extends FilePreviewProps {
	file?: File | null,
	link?: LinkObject,
	position?: number,
	resume?: boolean,
	onComplete?: (file: File, fid: string, docId?: string) => unknown, // docId only available when doc write quota is available
	onCancel?: (file: File) => unknown,
	onError?: (file: File, err: unknown) => unknown,
}
