import { DocumentReference } from "firebase/firestore";
import React, { createContext, useEffect, useMemo, useRef } from "react";
import { createFileDoc } from "../../models/files";
import { Link as LinkObj } from "../../models/links";
import { AuthStatus } from "../../utils/auths";
import { now } from "../../utils/dates";
import { FilesStatus } from "../../utils/files";
import { useParallelTracker } from "../../utils/useParallelTracker";
import { useProgressTracker } from "../../utils/useProgressTracker";
import { useStatus } from "../../utils/useStatus";
import { FileUploadProps } from "../FileUpload";

const MAX_CONCURRENT_UPLOAD = 2;

const methodNotImplemented = () => { throw new Error("Method not implemented"); };

export const BatchUploadContext = createContext<BatchUploadContextInterface>({
	fileDocs: new Map(),
	pushOrders: new Map(),
	files: [], add: methodNotImplemented, remove: methodNotImplemented, setCancelled: methodNotImplemented,
	setCompleted: methodNotImplemented, setFailed: methodNotImplemented, resume: methodNotImplemented,
	hasCompleted: methodNotImplemented, hasCancelled: methodNotImplemented, hasFailed: methodNotImplemented,
	completedCount: -1, cancelledCount: -1, failedCount: -1,
	status: [], appendStatus: methodNotImplemented, removeStatus: methodNotImplemented,
});

export const BatchUploadConfigContext = createContext<BatchUploadConfig>({
	link: new LinkObj(DocumentReference.prototype),
});

export const BatchUpload: React.FunctionComponent<BatchUploadProps> = ({
	children,
	link,
	disabled,
	maxFiles,
	maxSize,
	method,
	observer,
	onCompleted,
}) => {
	const { status, appendStatus, removeStatus } = useStatus<FilesStatus | AuthStatus>();
	const fileDocs = useRef<BatchUploadContextInterface["fileDocs"]>(new Map);
	const pushOrders = useRef<BatchUploadContextInterface["pushOrders"]>(new Map());

	const {
		keys: files, setKeys: setFiles, removeKey: removeFile,
		markCompleted, markFailed, hasCompleted, hasFailed,
		completedCount, cancelledCount, failedCount
	} = useProgressTracker<File>([]);
	const { markCompleted: markPCompleted, markPaused: markPPaused, runnings } = useParallelTracker(files, MAX_CONCURRENT_UPLOAD);

	const ctx = useMemo<BatchUploadContextInterface>(() => ({
		fileDocs: fileDocs.current,
		pushOrders: pushOrders.current,
		files,
		add: (...files) => setFiles(c => {
			const currentTime = now();
			const combined = [...c];
			files.forEach((f, i) => {
				pushOrders.current.set(f, currentTime + i);
				combined.push(f);
			});

			return combined;
		}),
		remove: removeFile,
		setCompleted: (file) => { markCompleted(file); markPCompleted(file); },
		setCancelled: removeFile,
		setFailed: (file) => { markFailed(file); markPPaused(file); },
		hasCompleted, hasFailed,
		hasCancelled: files.includes,
		resume: (file) => runnings.includes(file),
		completedCount, cancelledCount, failedCount,
		status, appendStatus, removeStatus,
	}), [files, removeFile, hasCompleted, hasFailed, completedCount, cancelledCount, failedCount, status, appendStatus, removeStatus, setFiles, markCompleted, markPCompleted, markFailed, markPPaused, runnings]);

	const config = useMemo<BatchUploadConfig>(() => ({
		link, disabled, maxFiles, maxSize, method,
	}), [disabled, link, maxFiles, maxSize, method]);

	const _stateless = { onCompleted, observer };
	const stateless = useRef(_stateless);

	// trigger completed when file count is equal to complete + cancel count
	// and some other criteria
	useEffect(() => {
		if (files.length === (completedCount + cancelledCount)) {
			const leadFile = files[0];
			if (leadFile) stateless.current.onCompleted?.(files);
			
			stateless.current.observer?.("none", completedCount, cancelledCount, files.length);
		} else if (files.length) {
			stateless.current.observer?.("processing", completedCount, cancelledCount, files.length);
		}
	}, [cancelledCount, completedCount, files]);

	return <BatchUploadContext.Provider value={ctx}>
		<BatchUploadConfigContext.Provider value={config}>
			{children}
		</BatchUploadConfigContext.Provider>
	</BatchUploadContext.Provider>;
};

export type BatchUploadState = "none" | "processing" | "error";

export type BatchUploadContextInterface = {
	fileDocs: Map<string, { name: string, order: number, extras?: Parameters<typeof createFileDoc>["3"] }>,
	pushOrders: Map<File, number>, // uses timestamp and index to create the order of association of files (into links)
	files: File[],
	add: (...files: File[]) => unknown,
	remove: (file: File) => unknown,
	setCompleted: (file: File) => unknown,
	setCancelled: (file: File) => unknown,
	setFailed: (file: File) => unknown,
	hasCompleted: (file: File) => boolean,
	hasCancelled: (file: File) => boolean,
	hasFailed: (file: File) => boolean,
	resume: (file: File) => boolean,
	completedCount: number,
	cancelledCount: number,
	failedCount: number,
	status: (FilesStatus | AuthStatus)[],
	appendStatus: (status: FilesStatus | AuthStatus) => unknown,
	removeStatus: (status: FilesStatus | AuthStatus) => unknown
};

export type BatchUploadConfig = {
	link: LinkObj, // uploaded files will be linked to this link reference
	method?: FileUploadProps["method"],
	maxFiles?: number, // maximum number of files to be uploaded; enter 0 for no limits
	maxSize?: number, // max size of each file
	disabled?: boolean,
}

export type BatchUploadProps = React.PropsWithChildren<BatchUploadConfig> & {
	onCompleted?: (files: File[]) => unknown, // callback after file uploads are completed successfully
	observer?: (state: BatchUploadState, uploaded: number, cancelled: number, total: number) => unknown,
}
