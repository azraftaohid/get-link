import { DocumentReference } from "firebase/firestore";
import { createContext, useEffect, useMemo, useRef } from "react";
import { Link as LinkObj } from "../../models/links";
import { AuthStatus } from "../../utils/auths";
import { FilesStatus } from "../../utils/files";
import { useParallelTracker } from "../../utils/useParallelTracker";
import { useProgressTracker } from "../../utils/useProgressTracker";
import { useStatus } from "../../utils/useStatus";
import { FileUploadProps } from "../FileUpload";

const MAX_CONCURRENT_UPLOAD = 2;

const methodNotImplemented = () => { throw new Error("Method not implemented"); };

export const BatchUploadContext = createContext<BatchUploadContextInterface>({
	files: [], add: methodNotImplemented, remove: methodNotImplemented, setCancelled: methodNotImplemented,
	setCompleted: methodNotImplemented, setFailed: methodNotImplemented, resume: methodNotImplemented,
	completedCount: -1, cancelledCount: -1, failedCount: -1,
	status: [], appendStatus: methodNotImplemented, removeStatus: methodNotImplemented,
});

export const BatchUploadConfigContext = createContext<BatchUploadConfig>({
	link: new LinkObj(DocumentReference.prototype),
});

/** to be BatchUpload */
export const BatchUpload: React.FunctionComponent<BatchUploadProps> = ({
	children,
	link, disabled, maxFiles, maxSize, method, observer, onCompleted, startOrder
}) => {

	const { status, appendStatus, removeStatus } = useStatus<FilesStatus | AuthStatus>();

	const {
		keys: files, setKeys: setFiles, removeKey: removeFile,
		markCompleted, markFailed,
		completedCount, cancelledCount, failedCount
	} = useProgressTracker<File>([]);
	const { markCompleted: markPCompleted, markPaused: markPPaused, runnings } = useParallelTracker(files, MAX_CONCURRENT_UPLOAD);

	const ctx = useMemo<BatchUploadContextInterface>(() => ({
		files,
		add: (...files) => setFiles(c => [...c, ...files]),
		remove: removeFile,
		setCompleted: (file) => { markCompleted(file); markPCompleted(file); },
		setCancelled: removeFile,
		setFailed: (file) => { markFailed(file); markPPaused(file); },
		resume: (file) => runnings.includes(file),
		completedCount, cancelledCount, failedCount,
		status, appendStatus, removeStatus,
	}), [files, removeFile, completedCount, cancelledCount, failedCount, status, appendStatus, removeStatus, setFiles, markCompleted, markPCompleted, markFailed, markPPaused, runnings]);

	const config = useMemo<BatchUploadConfig>(() => ({
		link, disabled, maxFiles, maxSize, method, startOrder,
	}), [disabled, link, maxFiles, maxSize, method, startOrder]);

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
	files: File[],
	add: (...files: File[]) => unknown,
	remove: (file: File) => unknown,
	setCompleted: (file: File) => unknown,
	setCancelled: (file: File) => unknown,
	setFailed: (file: File) => unknown,
	resume: (file: File) => boolean,
	completedCount: number,
	cancelledCount: number,
	failedCount: number,
	status: (FilesStatus | AuthStatus)[],
	appendStatus: (status: FilesStatus | AuthStatus) => unknown,
	removeStatus: (status: FilesStatus | AuthStatus) => unknown
};

export type BatchUploadConfig = {
	link: LinkObj,
	method?: FileUploadProps["method"],
	maxFiles?: number, // maximum number of files to be uploaded; enter 0 for no limites
	maxSize?: number,
	disabled?: boolean,
	startOrder?: number,
}

export type BatchUploadProps = React.PropsWithChildren<BatchUploadConfig> & {
	onCompleted?: (files: File[]) => unknown, // callback after file uploads are completed successfully
	observer?: (state: BatchUploadState, uploaded: number, cancelled: number, total: number) => unknown,
}
