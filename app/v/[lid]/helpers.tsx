import { FileField, getFileDocs } from "@/models/files";
import { OrderField } from "@/models/order";
import { FieldPath, documentId, orderBy, query, startAfter } from "firebase/firestore";

export const FETCH_LIMIT = 12;

export function makeFilesQuery(lid: string, afterPos?: number, afterDocId?: string) {
	const baseQuery = query(getFileDocs(),
		orderBy(new FieldPath(FileField.LINKS, lid, OrderField.CREATE_ORDER), "asc"),
		orderBy(documentId(), "asc"));

	if (afterPos !== undefined && afterDocId !== undefined) return query(baseQuery, startAfter(afterPos, afterDocId));
	return baseQuery;
}
