import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { UploadMetadata, UploadTask, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { nanoid } from "nanoid";
import React, { useContext, useEffect, useRef, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Dimension, DimensionField } from "../models/dimension";
import { FileField, createFID, deleteFile, getFileRef } from "../models/files";
import { Link as LinkObject } from "../models/links";
import { FileCustomMetadata, FilesStatus, getFileType, getImageDimension, getPdfDimension, getVideoDimension } from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { generateThumbnailFromVideo } from "../utils/video";
import { FilePreview, FilePreviewProps } from "./FilePreview";
import Link from "./Link";
import { BatchUploadConfigContext, BatchUploadContext } from "./batch_upload/BatchUpload";

const MAX_ATTEMPT = 3;

const ErrorLink: React.FunctionComponent<{ code: FilesStatus }> = ({ code }) => {
	return <Link variant="danger" href={`/technical#${encodeURIComponent(code)}`}>
		{code}
	</Link>;
};

const statusMessages: Record<FilesStatus, React.ReactNode> = {
	"files:capture-completed": "Completed",
	"files:capture-failed": <ErrorLink code="files:capture-failed" />,
	"files:upload-failed": <ErrorLink code="files:upload-failed" />,
	"files:upload-paused": "Paused",
	"files:upload-completed": "Uploaded",
	"files:creating-doc": "Storing metadata.",
	"files:creating-thumbnail": "Creating thumbnail.",
	"files:doc-created": "Metadata stored.",
	"files:unknown-error": "Something went wrong.",
	"files:upload-cancelled": "Cancelled",
	"files:too-large": "File too large",
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
	method = "inline",
	order = 0,
	onComplete,
	onCancel,
	onError,
	...rest
}) => {
	const { fileDocs, files, add, remove, setCompleted, setCancelled, setFailed, resume } = useContext(BatchUploadContext);
	const { disabled } = useContext(BatchUploadConfigContext);

	const attempt = useRef(0);

	const { data: user } = useAuthUser(["usr"], getAuth());
	const uid = user?.uid;

	const [status, setStatus] = useState<FilesStatus>();
	const [fid, setFid] = useState<string>();

	const handleComplete = (file: File, fid: string) => {
		setFid(fid);
		setCompleted(file);
		
		onComplete?.(file, fid);
	};

	const handleCancel = (file: File) => {
		setCancelled(file);
		onCancel?.(file);
	};

	const handleError = (file: File, err: unknown) => {
		setFailed(file);
		onError?.(file, err);
	};

	const [control, setControl] = useState<UploadTask>();
	const pendingCancel = useRef(false);

	const [progress, setProgress] = useState(0);

	// stateless function: assiciateWithLink; binds the uploaded file with provided link
	const associateWithLink = async (fid: string, file: File) => {
		if (!link) return;

		if (method === "standalone") {
			fileDocs.set(fid, { name: file.name, order });
		} else {
			link.pushFile(fid, order, {
				[FileField.OVERRIDES]: {
					name: file.name,
				},
			});
		}

		if (order === 0) link.setCover({ fid });
	};

	const _stateless = { files, add, remove, associateWithLink, handleComplete, handleCancel, handleError };
	const stateless = useRef(_stateless);
	stateless.current = _stateless;

	useEffect(() => {
		pendingCancel.current = false;
	}, [file]);

	// attempts to upload file, whenever uid or file reference has changed
	useEffect(() => {
		if (!file || !uid || pendingCancel.current) return;

		const handler = async () => {
			attempt.current++;
			
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
					const perct = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
					setProgress(perct);

					switch (snapshot.state) {
						case "paused": setStatus("files:upload-paused"); break;
						case "canceled": setStatus("files:upload-cancelled"); break;
						case "success": setStatus("files:upload-completed"); break;
						case "running": setStatus(undefined); break;
					}
				},
				(err) => {
					if (err.code === "storage/canceled") {
						stateless.current.handleCancel(file);
					} else {
						setStatus("files:upload-failed");
						stateless.current.handleError(file, err);
					}
				},
				() => {
					stateless.current.associateWithLink(fid, file).then(() => {
						setStatus("files:capture-completed");
						stateless.current.handleComplete(file, fid);
					}).catch(error => {
						setStatus("files:capture-failed");
						stateless.current.handleError(file, error);

						deleteFile(fid).catch(err => {
							if (err.code === "not-found" || err.code === "storage/object-not-found") return;
							console.error(`error deleting file after failed to associate with link [cause: ${err}]`);
						});
					});
				}
			);

			return { upload, unsubscribe };
		};

		let task: ReturnType<typeof handler> | undefined;
		if (pendingCancel.current) console.debug("upload task ignored, as was cancelled before.");
		else if (attempt.current >= MAX_ATTEMPT) stateless.current.handleError(file, new Error("max attempt threshold reached."));
		else task = handler();

		return () => {
			task?.then(({ upload, unsubscribe }) => {
				if (upload.snapshot.state === "running" || upload.snapshot.state === "paused") {
					upload.cancel();
				}

				unsubscribe();
			});
		};
	}, [file, uid]);

	// syncs resume status with upload control
	useEffect(() => {
		if (file && resume(file)) control?.resume();
		else control?.pause();
	}, [control, file, resume]);

	useEffect(() => {
		if (file) {
			if (!stateless.current.files.includes(file)) stateless.current.add(file);
			
			const remover = stateless.current.remove;
			return () => { remover(file); };
		}
	}, [file]);

	return <div>
		<FilePreview
			className="border border-secondary border-bottom-0 rounded-0 rounded-top"
			file={file} {...rest}
			onClose={() => {
				switch (control?.snapshot.state) {
					case "paused":
						control.resume();
						control.cancel();
						return;
					case "error":
						if (file) stateless.current.handleCancel(file);
						return;
					case "success": {
						if (fid) {
							deleteFile(fid).catch(err => {
								console.error(`error deleting file from the server [file: ${file?.name}; err: ${err}]`);
							});
							
							// todo: remove from cover if order is 0
							// todo: set the next least order value fid as cover
							link?.removeFile(fid);
							fileDocs.delete(fid);
						}

						if (file) stateless.current.handleCancel(file);
						
						setStatus("files:upload-cancelled");
						break;
					}
					default:
						if (control) return control.cancel();
				}

				pendingCancel.current = true;
				if (file) stateless.current.handleCancel(file);

				setStatus("files:upload-cancelled");
			}}
			closable={!disabled}
		/>
		<ProgressBar
			id="file-upload-progress"
			className="border border-secondary border-top-0 rounded-0 rounded-bottom"
			striped={true}
			animated={!status?.includes("files:capture-completed")}
			now={progress}
		/>
		{file ? <StatusIndicator>{status ? statusMessages[status] : `${progress}% completed.`}</StatusIndicator>
			: <StatusIndicator variant="danger">
				Aborted.
			</StatusIndicator>}
	</div>;
};

interface StatusIndicatorProps extends React.PropsWithChildren<React.HTMLAttributes<HTMLElement>> {
	variant?: "muted" | "danger" | "warning",
}

export interface FileUploadProps extends FilePreviewProps {
	file?: File | null,
	link?: LinkObject,
	order?: number,
	onComplete?: (file: File, fid: string) => unknown,
	onCancel?: (file: File) => unknown,
	onError?: (file: File, err: unknown) => unknown,
	method?: "inline" | "standalone",
}