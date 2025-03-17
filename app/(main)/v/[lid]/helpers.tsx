import { COLLECTION_FILES, FileField } from "@/models/files";
import { OrderField } from "@/models/order";
import { FieldPath, collection, documentId, getFirestore, orderBy, query, startAfter } from "firebase/firestore/lite";

export const FETCH_LIMIT = 12;

export function makeFilesQuery(lid: string, afterPos?: number, afterDocId?: string) {
	const db = getFirestore();
	const fileDocs = collection(db, COLLECTION_FILES);

	const baseQuery = query(fileDocs,
		orderBy(new FieldPath(FileField.LINKS, lid, OrderField.CREATE_ORDER), "asc"),
		orderBy(documentId(), "asc"));

	if (afterPos !== undefined && afterDocId !== undefined) return query(baseQuery, startAfter(afterPos, afterDocId));
	return baseQuery;
}
