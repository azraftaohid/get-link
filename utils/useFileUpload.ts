import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import { StorageError, UploadMetadata, UploadTask, UploadTaskSnapshot, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimension, DimensionField } from "../models/dimension";
import { createFID, createFileDoc, getFileRef } from "../models/files";
import { FileCustomMetadata, getFileType, getImageDimension, getPdfDimension, getVideoDimension } from "./files";
import { generateThumbnailFromVideo } from "./video";

/**
 * Usage:
 * ```
 * const uploads = useFileUpload(file, link);
 * 
 * useEffect(() => {
 * 	return uploads.subscribe(state => { ... }, err => { ... });
 * }, [uploads]);
 * ```
 * 
 * @param file The file to be uploaded
 * @param link A link to be associated with this file's document
 * @return A Upload Observer to get state changes triggers.
 */
export const useFileUpload = (file: File | null, link?: string) => {
	const errorHandlers = useRef<UploadErrorObserver[]>([]);
	const stateHandlers = useRef<UploadStateObserver[]>([]);

	const user = useAuthUser(["usr"], getAuth());
	const uid = user.data?.uid;
	
	const [task, setTask] = useState<UploadTask>();

	useEffect(() => {
		if (!file) return;
		if (!uid) {
			signInAnonymously(getAuth()).catch((err) => {
				console.error(`error signing in user [cause: ${err}]`);

				const cerr: UploadFileError = {
					...err,
					name: "FirebaseError",
					code: "auth:sign-in-error",
					serverResponse: null,
				};
				errorHandlers.current.forEach(v => v(cerr));
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

			try {
				let localUrl: string | undefined;
				let dimension: Dimension | undefined;

				if (mime?.startsWith("image")) {
					localUrl = URL.createObjectURL(file);
					dimension = await getImageDimension(localUrl);
				} else if (mime?.startsWith("video")) {
					localUrl = URL.createObjectURL(file);
					dimension = await getVideoDimension(localUrl);

					appendStatus("files:creating-thumbnail");
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
					removeStatus("files:creating-thumbnail");
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
			setTask(upload);

			const unsubscribe = upload.on(
				"state_changed",
				async (snapshot) => {
					setProgress(Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
				},
				(err) => {
					if (err.code === "storage/canceled") {
						console.info("upload cancelled");
						cancel.current?.(file);
						setStatus(["files:upload-cancelled"]);
					} else {
						setStatus(["files:upload-error"]);
						handleError.current?.(file, err);
					}

					setProgress(0);
					setStatus([]);
				},
				async () => {
					appendStatus("files:creating-doc");

					try {
						const doc = await createFileDoc(fid, file.name, links.current);
						console.debug(`file mirror doc created at ${doc.path}`);

						handleComplete.current?.(file, doc.id, fid);
						setStatus(["files:doc-created"]);
					} catch (error) {
						handleError.current?.(file, error);
					}
				}
			);

			return { upload, unsubscribe };
		})();
	}, []);

	return {
		...(useCallback(() => ({
			resume: task?.resume(),
			cancel: task?.cancel(),
			pause: task?.pause(),
			subscribe: (stateObserver?: UploadStateObserver, errorObserver?: UploadErrorObserver) => {
				if (stateObserver) stateHandlers.current.push(stateObserver);
				if (errorObserver) errorHandlers.current.push(errorObserver);
	
				return () => {
					if (stateObserver) {
						const i = stateHandlers.current.indexOf(stateObserver);
						if (i !== -1) {
							stateHandlers.current = [...stateHandlers.current.slice(0, i), ...stateHandlers.current.slice(i + 1)];
						}
					}
	
					if (errorObserver) {
						const i = errorHandlers.current.indexOf(errorObserver);
						if (i !== -1) {
							errorHandlers.current = [...errorHandlers.current.slice(0, i), ...errorHandlers.current.slice(i + 1)];
						}
					}
				};
			},
		}), [task]))(),
	};
};

export type UploadStateObserver = (snapshot: UploadTaskSnapshot) => unknown;
export type UploadErrorObserver = (err: UploadFileError) => unknown;

export interface UploadFileError extends StorageError {
	
}
