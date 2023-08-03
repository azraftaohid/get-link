import { createContext, useMemo } from "react";
import { AuthStatus } from "../../utils/auths";
import { FilesStatus } from "../../utils/files";
import { useParallelTracker } from "../../utils/useParallelTracker";
import { useProgressTracker } from "../../utils/useProgressTracker";
import { useStatus } from "../../utils/useStatus";

const MAX_CONCURRENT_UPLOAD = 2;

const methodNotImplemented = () => { throw new Error("Method not implemented"); };

export const BatchUploadContext = createContext<BatchUploadContextInterface>({
	files: [], add: methodNotImplemented, remove: methodNotImplemented, setCancelled: methodNotImplemented,
	setCompleted: methodNotImplemented, setFailed: methodNotImplemented, shouldResume: methodNotImplemented,
	completedCount: -1, cancelledCount: -1, failedCount: -1,
	status: [], appendStatus: methodNotImplemented, removeStatus: methodNotImplemented,
});

export const BatchUploadWrapper: React.FunctionComponent<BatchUploadProps> = ({
	children,
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
		shouldResume: (file) => runnings.includes(file),
		completedCount, cancelledCount, failedCount,
		status, appendStatus, removeStatus,
	}), [files, removeFile, completedCount, cancelledCount, failedCount, status, appendStatus, removeStatus, setFiles, markCompleted, markPCompleted, markFailed, markPPaused, runnings]);

	return <BatchUploadContext.Provider value={ctx}>
		{children}
	</BatchUploadContext.Provider>;
};

export type BatchUploadContextInterface = {
	files: File[],
	add: (...files: File[]) => unknown,
	remove: (file: File) => unknown,
	setCompleted: (file: File) => unknown,
	setCancelled: (file: File) => unknown,
	setFailed: (file: File) => unknown,
	shouldResume: (file: File) => boolean,
	completedCount: number,
	cancelledCount: number,
	failedCount: number,
	status: (FilesStatus | AuthStatus)[],
	appendStatus: (status: FilesStatus | AuthStatus) => unknown,
	removeStatus: (status: FilesStatus | AuthStatus) => unknown
};

export type BatchUploadProps = React.PropsWithChildren<Record<string, unknown>>;
