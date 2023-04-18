import { arrayUnion, collection, CollectionReference, doc, DocumentReference, getFirestore, Query, query, setDoc, Transaction, where, WithFieldValue } from "firebase/firestore/lite";
import { ref as fileRef, getStorage, StorageReference } from "firebase/storage";
import { v5 as uuidV5 } from "uuid";
import { FileCustomMetadata } from "../utils/files";
import { extractDisplayName } from "../utils/strings";
import { Warning } from "./links";

/**
 * Database structure:
 * 
 * ## Definitions
 * 	- FID: unique file ID; often implies to the file path
 * 	- Name: name of the file, that comprises the display name + extension
 * 
 * Firestore:
 * files/file { ..., overrides: { }, links: [], ... }
 * 
 * ## Storage
 * user/uid/file_name
 */

export const COLLECTION_FILES = "files";

export const NAMESPACE_FILES = "3b436020-ef99-49fe-9b8a-a96554172278";

export function createFileDocId(fid: string) {
	return uuidV5(fid, NAMESPACE_FILES);
}

export function getFileDocs(): CollectionReference<File>;
export function getFileDocs(lid: string): Query<File>;
export function getFileDocs(lid?: string) {
	const col = collection(getFirestore(), COLLECTION_FILES);
	if (!lid) return col;
	return query(col, where(FileField.LINKS, "array-contains", lid));
}

export function createFID(fileName: string, uid: string) {
	return `users/${uid}/${fileName}`;
}

export function getFileRef(fid: string): StorageReference;
export function getFileRef(fileName: string, uid: string): StorageReference;
export function getFileRef(s1: string, s2?: string) {
	return fileRef(getStorage(), s2 ? createFID(s1, s2) : s1);
}

export function getThumbnailRef(fid: string, size: ThumbnailSize) {
	const displayName = extractDisplayName(fid);
	return fileRef(getStorage(), `${displayName}_${size}.jpeg`);
}

export function getFileDocRef(docId: string) {
	return doc(getFileDocs(), docId);
}

export function linkFile(docRef: DocumentReference<File>, linkIds: string[]): Promise<void>;
export function linkFile(docRef: DocumentReference<File>, linkIds: string[], transaction?: Transaction): Transaction;
export function linkFile(docRef: DocumentReference<File>, linkIds: string[], transaction?: Transaction) {
	const data: WithFieldValue<File> = {
		[FileField.LINKS]: arrayUnion(...linkIds),
	};

	return transaction ? transaction.set(docRef, data) : setDoc(docRef, data);
}

export async function createFileDoc(fid: string, 
	name: string, 
	links?: string[], 
	extras?: Omit<File, FileField.FID | FileField.NAME | FileField.LINKS>) {
		const docRef = getFileDocRef(createFileDocId(fid));
		
		const data: WithFieldValue<File> = { ...extras, [FileField.FID]: fid, [FileField.NAME]: name };
		if (links) data[FileField.LINKS] = arrayUnion(...links);

		await setDoc(docRef, data);
		return docRef;

}

export type ThumbnailSize = "56x56" | "128x128" | "384x384" | "1024x1024";

export enum FileField {
	NAME = "name",
	FID = "fid",
	OVERRIDES = "overrides",
	WARNS = "warnings",
	LINKS = "links",
	POSITION = "position",
}

export interface File {
	[FileField.NAME]?: string;
	[FileField.FID]?: string;
	[FileField.WARNS]?: Warning[];
	[FileField.OVERRIDES]?: FileCustomMetadata;
	[FileField.LINKS]?: string[],
	[FileField.POSITION]?: number,
}
