import { CollectionReference, Timestamp, collection, doc, getFirestore } from "firebase/firestore";

export const enum ExportField {
	LID = "lid",
	FIDS = "fids",
	BREAKPOINTS = "breakpoints",
	FILENAME_PREFIX = "filename_prefix",
	SAVEAS_PREFIX = "save_as_name_prefix",
	OUTPUT = "output",
};

export const enum OutputField {
	BUNDLES = "bundles",
	ERROR = "error",
	SKIPPED = "skipped",
	CONTINUE_TOKEN = "continue_token",
	START_TIME = "start_time",
	END_TIME = "end_time",
	STATE = "state",
	EXPIRE_TIME = "expire_time",
}

export const enum BundleField {
	URL = "dlink",
	NAME = "name",
	SIZE = "size",
}

export const COLLECTION_EXPORT = "exports";

export function getExports(): CollectionReference<ExportData> {
	return collection(getFirestore(), COLLECTION_EXPORT);
}

export function getExport(docId: string) {
	return doc(getExports(), docId);
}

export interface Bundle {
	[BundleField.URL]?: string,
	[BundleField.NAME]?: string,
	[BundleField.SIZE]?: number,
}

export interface Output {
	[OutputField.BUNDLES]?: Bundle[],
	[OutputField.CONTINUE_TOKEN]?: number,
	[OutputField.ERROR]?: { message: string, instance_id: string },
	[OutputField.SKIPPED]?: Record<string, string>,
	[OutputField.START_TIME]?: Timestamp,
	[OutputField.END_TIME]?: Timestamp,
	[OutputField.STATE]?: "PENDING" | "SUCCESS" | "FAILED" | "PROCESSING",
	[OutputField.EXPIRE_TIME]?: Timestamp,
}

export interface ExportData {
	[ExportField.LID]?: string,
	[ExportField.SAVEAS_PREFIX]?: string,
	[ExportField.FIDS]?: { count?: number, data?: string[] },
	[ExportField.BREAKPOINTS]?: { count?: number, data?: number[] },
	[ExportField.FILENAME_PREFIX]?: "ORDER" | false,
	[ExportField.OUTPUT]?: Output,
}
