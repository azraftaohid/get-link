import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import { useRouter } from "next/router";
import React, { useCallback, useContext, useEffect, useRef } from "react";
import Stack from "react-bootstrap/Stack";
import { DropzoneOptions, useDropzone } from "react-dropzone";
import { Link as LinkObj } from "../../models/links";
import { defaultQuotas } from "../../models/quotas";
import styles from "../../styles/multi-file-upload.module.scss";
import { acceptedFileFormats } from "../../utils/files";
import { mergeNames } from "../../utils/mergeNames";
import { useToast } from "../../utils/useToast";
import { Conditional } from "../Conditional";
import { FileUpload, FileUploadProps } from "../FileUpload";
import { Icon } from "../Icon";
import { BatchUploadContext } from "./BatchUploadWrapper";

export const BatchUpload: React.FunctionComponent<BatchUploadProps> = ({
	link,
	method,
	hint = "Upload files",
	subtext = "Expires after 14 days",
	maxFiles = defaultQuotas.links.inline_fids.limit,
	maxSize = defaultQuotas.storage.file_size.limit,
	onCompleted,
	observer,
	disabled,
	startPos = 0,
	continous: continousUpload = false,
}) => {
	const router = useRouter();
	const { data: user } = useAuthUser(["user"], getAuth());
	const { makeToast } = useToast();

	const {
		files, add: addFiles, remove: removeFile,
		setCompleted, setFailed, appendStatus, removeStatus,
		completedCount, cancelledCount,
		shouldResume,
	} = useContext(BatchUploadContext);

	const handleUploadCompleted: FileUploadProps["onComplete"] = (file, fid) => {
		if (!link.getCover()) link.setCover({ fid });

		setCompleted(file);
	};
	const handleUploadCancelled: FileUploadProps["onCancel"] = removeFile;
	const handleUploadError: FileUploadProps["onError"] = (file, err) => {
		console.error(`error uploading file: ${err}`);
		setFailed(file);

		appendStatus("files:upload-failed");
	};

	const statelessObjs = { appendStatus, removeStatus, addFiles, onCompleted, observer };
	const refs = useRef(statelessObjs);
	refs.current = statelessObjs;

	const handleDrop = useCallback<NonNullable<DropzoneOptions["onDrop"]>>(
		(dropped, rejects) => {
			if (rejects.length) {
				const errMssg = `Upload cancelled for the following files\n${rejects
					.map((reject) => {
						return `${reject.file.name}: ${reject.errors.map((err) => err.code).join(", ")}`;
					})
					.join("\n")}`;

				makeToast(errMssg, "error");
				return;
			}

			refs.current.addFiles(...dropped);
		},
		[makeToast]
	);

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		accept: acceptedFileFormats,
		onDrop: handleDrop,
		maxFiles: maxFiles,
		maxSize: maxSize,
		multiple: true,
		disabled: disabled,
	});

	const triggerChooser = router.query.open_chooser;
	useEffect(() => {
		if (triggerChooser !== "true") return;

		console.debug("manually trigger to open picker");
		open();
	}, [triggerChooser, open]);

	const uid = user?.uid;
	useEffect(() => {
		if (!files.length) return;
		if (!uid) {
			refs.current.appendStatus("auth:signing-in");
			signInAnonymously(getAuth()).then(() => {
				refs.current.removeStatus("auth:signing-in");
			}).catch((err) => {
				console.error(`error signing in user [cause: ${err}]`);
				refs.current.removeStatus("auth:signing-in");
				refs.current.appendStatus("auth:sign-in-error");
			});
		}
	}, [files.length, uid]);

	// trigger completed when file count is equal to complete + cancel count
	// and some other criteria
	useEffect(() => {
		if (files.length === (completedCount + cancelledCount)) {
			const leadFile = files[0];
			if (uid && leadFile) refs.current.onCompleted?.(files);
			
			refs.current.observer?.("none", completedCount, cancelledCount, files.length);
		} else if (files.length) {
			refs.current.observer?.("processing", completedCount, cancelledCount, files.length);
		}
	}, [cancelledCount, completedCount, files, uid]);

	return <>
		<Stack direction="vertical" gap={3}>
			{files.map((file, i) => <FileUpload
				key={`${file.name}-${file.size}`}
				link={link}
				file={file}
				method={method}
				position={startPos + i}
				resume={shouldResume(file)}
				onComplete={handleUploadCompleted}
				onCancel={handleUploadCancelled}
				onError={handleUploadError}
			/>)}
		</Stack>
		<Conditional in={continousUpload || files.length === 0}>
			<button
				{...getRootProps({
					id: "upload-area",
					type: "button",
					className: mergeNames(
						styles.uploadArea,
						"btn btn-outline-secondary",
						isDragActive && "active",
						files.length !== 0 && "mt-3 h-25"
					),
					disabled: disabled
				})}
			>
				<input {...getInputProps()} />
				<Icon name="file_upload" size="lg" />
				<p className="fs-5 mb-0">{!isDragActive ? hint : "Drop to upload"}</p>
				<small className="text-mute">{subtext}</small>
			</button>
		</Conditional>
	</>;
};

export type BatchUploadState = "none" | "processing" | "error";

export interface BatchUploadProps {
	link: LinkObj,
	method?: FileUploadProps["method"],
	hint?: React.ReactNode,
	subtext?: React.ReactNode,
	maxFiles?: number, // maximum number of files to be uploaded; enter 0 for no limites
	maxSize?: number,
	onCompleted?: (files: File[]) => unknown, // callback after file uploads are completed successfully
	observer?: (state: BatchUploadState, uploaded: number, cancelled: number, total: number) => unknown,
	disabled?: boolean,
	startPos?: number,
	continous?: boolean,
}
