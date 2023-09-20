import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import { useRouter } from "next/router";
import React, { useContext, useEffect, useRef } from "react";
import { DropzoneOptions, useDropzone } from "react-dropzone";
import styles from "../../styles/batch_upload/dropzone.module.scss";
import { acceptedFileFormats, shallowHash } from "../../utils/files";
import { mergeNames } from "../../utils/mergeNames";
import { useToast } from "../../utils/useToast";
import { Conditional } from "../Conditional";
import { Icon } from "../Icon";
import { BatchUploadConfigContext, BatchUploadContext } from "./BatchUpload";

export const DropZone: React.FunctionComponent<DropZoneProps> = ({
	className,
	hint = "Upload files",
	subtext = "Expires after 14 days",
	disabled: _disabled,
	continous = false,
	...rest
}) => {
	const router = useRouter();
	const { data: user } = useAuthUser(["usr"], getAuth());
	const { makeToast } = useToast();

	const {
		files, add: addFiles,
		appendStatus, removeStatus,
	} = useContext(BatchUploadContext);
	const { disabled: inheritedDisabled, maxFiles, maxSize } = useContext(BatchUploadConfigContext);

	const disabled = _disabled !== undefined ? _disabled : inheritedDisabled || (maxFiles === files.length);

	const statelessObjs = { appendStatus, removeStatus, addFiles };
	const refs = useRef(statelessObjs);
	refs.current = statelessObjs;

	const handleDrop: NonNullable<DropzoneOptions["onDrop"]> = (dropped, rejects) => {
		if (rejects.length) {
			const errMssg = `Upload cancelled for the following files\n${rejects
				.map((reject) => {
					return `${reject.file.name}: ${reject.errors.map((err) => err.code).join(", ")}`;
				})
				.join("\n")}`;

			makeToast(errMssg, "error");
			return;
		}

		const uniques: File[] = [];
		const duplicates: string[] = [];

		const existingHashes = files.map(v => shallowHash(v));
		dropped.forEach(input => {
			if (existingHashes.includes(shallowHash(input))) {
				duplicates.push(input.name);
				return;
			}

			uniques.push(input);
		});

		if (duplicates.length) makeToast(`The following duplicate files were omitted:\n${duplicates.join(",\n")}`, "warning");
		addFiles(...uniques);
	};

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		accept: acceptedFileFormats,
		onDrop: handleDrop,
		maxFiles: maxFiles ? maxFiles - files.length : 0,
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

	return <>
		<Conditional className="h-100" in={continous || files.length === 0}>
			<button
				{...getRootProps({
					id: "upload-area",
					type: "button",
					className: mergeNames(
						styles.uploadArea,
						"btn btn-outline-secondary",
						isDragActive && "active",
						className,
					),
					disabled,
					...rest
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

export interface DropZoneProps extends Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "id" | "type"> {
	hint?: React.ReactNode,
	subtext?: React.ReactNode,
	continous?: boolean,
}
