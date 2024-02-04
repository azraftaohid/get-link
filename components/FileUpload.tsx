import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { nanoid } from "nanoid";
import React, { useContext, useEffect, useRef, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Dimension, DimensionField } from "../models/dimension";
import { FileField, createFID, deleteFile, getFileKey } from "../models/files";
import { Link as LinkObject } from "../models/links";
import { NotFound } from "../utils/errors/NotFound";
import { FileCustomMetadata, FilesStatus, getFileType, getImageDimension, getPdfDimension, getVideoDimension } from "../utils/files";
import { uploadObject, uploadObjectResumable } from "../utils/storage";
import { percEncoded } from "../utils/strings";
import { Upload, UploadParams } from "../utils/upload/Upload";
import { generateThumbnailFromVideo } from "../utils/video";
import { FilePreview, FilePreviewProps } from "./FilePreview";
import Link from "./Link";
import { BatchUploadConfigContext, BatchUploadContext } from "./batch_upload/BatchUpload";
import { TextualProgress } from "./progress/TextualProgress";

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
	const [uploadedFile, setUploadedFile] = useState<{ fid: string, size: number }>();

	const handleComplete = (file: File, fid: string) => {
		setUploadedFile({ fid, size: file.size });
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

	const [control, setControl] = useState<Upload>();
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
					customMetadata: {
						name: file.name,
					}
				},
			});
		}
		
		link.increaseDownloadSize(file.size);
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
			console.debug(`File loaded for upload [mime-type: ${mime}; ext: ${ext}]`);

			const prefix = nanoid(12);
			const fid = createFID(prefix + ext, uid);
			const fileKey = getFileKey(fid);
			const metadata: UploadParams["metadata"] = {
				mimeType: mime,
				contentDisposition: `inline; filename*=utf-8''${percEncoded(file.name)}`,
			};

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
							await uploadObject(getFileKey(createFID(prefix + ".png", uid)), thumbnail, {
								mimeType: "image/png",
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
						width: dimension[DimensionField.WIDTH]?.toString(),
						height: dimension[DimensionField.HEIGHT]?.toString(),
					} as FileCustomMetadata;
				}
			} catch (error) {
				console.error(`error getting dimension from selected file [cause: ${error}]`);
			}

			const upload = uploadObjectResumable(fileKey, file, metadata);
			setControl(upload);

			upload.on("progress", ({ uploadedBytes, totalBytes = uploadedBytes }) => {
				const perct = Math.floor((uploadedBytes / totalBytes) * 100);
				setProgress(perct);
			}).on("state_changed", ({ state }) => {
				console.debug(`Upload state changed to ${state}.`);
				switch (state) {
					case "paused": setStatus("files:upload-paused"); break;
					case "canceled": setStatus("files:upload-cancelled"); break;
					case "success":
						setStatus("files:upload-completed");
						stateless.current.associateWithLink(fid, file).then(() => {
							setStatus("files:capture-completed");
							stateless.current.handleComplete(file, fid);
						}).catch(error => {
							setStatus("files:capture-failed");
							stateless.current.handleError(file, error);
	
							deleteFile(fid).catch(err => {
								if (err instanceof NotFound || err.code === "not-found") return;
								console.error(`Error deleting file after failed to associate with link [cause: ${err}]`);
							});
						});
						break;
					case "running": setStatus(undefined); break;
				}
			}).on("failed", (error) => {
				console.debug("Upload failed received.");
				if (error.code === "storage:upload-canceled") {
					stateless.current.handleCancel(file);
				} else {
					setStatus("files:upload-failed");
					stateless.current.handleError(file, error);
				}
			});

			return { upload };
		};

		let task: ReturnType<typeof handler> | undefined;
		if (pendingCancel.current) console.debug("upload task ignored, as was cancelled before.");
		else if (attempt.current >= MAX_ATTEMPT) stateless.current.handleError(file, new Error("max attempt threshold reached."));
		else task = handler();

		return () => {
			task?.then(({ upload }) => {
				upload.cancel();
				upload.removeAllListeners();
			});
		};
	}, [file, uid]);

	// syncs resume status with upload control
	useEffect(() => {
		if (file && resume(file)) control?.start();
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
				switch (control?.getState()) {
					case "paused":
						control.cancel();
						return;
					case "error":
						control.cancel();
						if (file) stateless.current.handleCancel(file);
						return;
					case "success": {
						if (uploadedFile) {
							deleteFile(uploadedFile.fid).catch(err => {
								console.error(`Error deleting file from the server [file: ${file?.name}; err: ${err}]`);
							});
							
							// todo: remove from cover if order is 0
							// todo: set the next least order value fid as cover
							link?.removeFile(uploadedFile.fid);
							link?.increaseDownloadSize(-uploadedFile.size);
							fileDocs.delete(uploadedFile.fid);
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
		{file ? <TextualProgress>{status ? statusMessages[status] : `${progress}% completed.`}</TextualProgress>
			: <TextualProgress variant="danger">
				Aborted.
			</TextualProgress>}
	</div>;
};

export interface FileUploadProps extends FilePreviewProps {
	file?: File | null,
	link?: LinkObject,
	order?: number,
	onComplete?: (file: File, fid: string) => unknown,
	onCancel?: (file: File) => unknown,
	onError?: (file: File, err: unknown) => unknown,
	method?: "inline" | "standalone",
}
