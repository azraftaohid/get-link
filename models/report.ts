import { collection, CollectionReference, doc, getFirestore, setDoc, Timestamp, WithFieldValue } from "firebase/firestore";
import { Name } from "./name";

/**
 * # reports collection
 * reports is a top-level collection containing user generated reports (mostly complaints)
 * for all purposes.
 */

export const REPORT_COLLECTION_ID = "reports";

export function getReports(): CollectionReference<ReportData> {
	return collection(getFirestore(), REPORT_COLLECTION_ID);
}

export function getReportRef(id?: string) {
	const col = getReports();
	return id ? doc(col, id) : doc(col);
}

export async function captureReport(data: WithFieldValue<ReportData>) {
	const ref = getReportRef();
	await setDoc(ref, data);

	return ref.id;
}

export enum ReportField {
	NAME = "name",
	EMAIL = "email_address",
	MESSAGE = "message",
	PATH = "website_path",
	SESSION = "session_id",
	CREATE_TIME = "create_time",
	TICKET = "ticket_id",
}

export interface ReportData {
	[ReportField.NAME]?: Name;
	[ReportField.EMAIL]?: string;
	[ReportField.MESSAGE]?: string;
	[ReportField.PATH]?: string;
	[ReportField.SESSION]?: string;
	[ReportField.CREATE_TIME]?: Timestamp,
	[ReportField.TICKET]?: string,
}
