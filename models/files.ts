import { getAuth } from "firebase/auth";
import { CollectionReference, DocumentReference, FieldPath, Query, Transaction, WithFieldValue, collection, deleteDoc, deleteField, doc, getDocs, getFirestore, limit, orderBy, query, setDoc, where } from "firebase/firestore";
import { v5 as uuidV5 } from "uuid";
import { FileCustomMetadata } from "../utils/files";
import { FileMetadata, deleteObject } from "../utils/storage";
import { compartFid, extractDisplayName } from "../utils/strings";
import { Warning } from "./links";
import { OrderData } from "./order";
import { UserSnapshot, UserSnapshotField } from "./users";

/**
 * Database structure:
 * 
 * ## Definitions
 * 	- FID: unique file ID; often implies to the file path w/o bucket name
 *  - CFID: canonical file ID; created from FID; used to refer document of a file
 * 	- Name: name of the file, that comprises the display name + extension
 * 
 * Firestore:
 * files/file { ..., fid: string, overrides: { }, links: { [lid]: InlineLinkData }, ... }
 * 
 * ## Storage
 * user/uid/file_name
 */

export const COLLECTION_FILES = "files_future";

export const NAMESPACE_FILES = "3b436020-ef99-49fe-9b8a-a96554172278";

export function createFID(fileName: string, uid: string) {
	return `users_future/${uid}/${fileName}`;
}

export function getFileKey(fid: string) {
	return fid;
}

export function getThumbnailKey(fid: string, size: ThumbnailSize) {
	const { uid, fileName } = compartFid(fid);
	const displayName = extractDisplayName(fileName);

	return `users_future/${uid}/thumbs/${displayName}_${size}.jpeg`;
}

export function createCFID(fid: string) {
	return uuidV5(fid, NAMESPACE_FILES);
}

export function getFileDocs(): CollectionReference<FileData>;
export function getFileDocs(lid: string): Query<FileData>;
export function getFileDocs(lid?: string) {
	const col = collection(getFirestore(), COLLECTION_FILES);
	if (!lid) return col;
	return query(col, orderBy(new FieldPath(FileField.LINKS, lid), "asc"));
}

export function getFileDocRef(cfid: string) {
	return doc(getFileDocs(), cfid);
}

export function linkFile(docRef: DocumentReference<FileData>, links: Record<string, InlineLinkData>): Promise<void>;
export function linkFile(docRef: DocumentReference<FileData>, links: Record<string, InlineLinkData>, transaction?: Transaction): Transaction;
export function linkFile(docRef: DocumentReference<FileData>, links: Record<string, InlineLinkData>, transaction?: Transaction) {
	const data: FileDocUpdateData = { [FileField.LINKS]: links };
	return transaction ? transaction.set(docRef, data, { merge: true }) : setDoc(docRef, data, { merge: true });
}

export async function detachLinkFromFile(fid: string, lid: string) {
	const files = getFileDocs(lid);
	const q = query(files, where(FileField.FID, "==", fid), limit(100));

	let docRefs: DocumentReference<FileData>[];
	try {
		const snapshot = await getDocs(q);
		docRefs = snapshot.docs.map(value => value.ref);
	} catch (error) {
		throw new Error(`failed to get file documents matching fid and link id [cause: ${error}]`);
	}

	const updateData: FileDocUpdateData = { [FileField.LINKS]: { [lid]: deleteField() } };
	const promises = docRefs.map(value => updateFileDoc(value, updateData));

	return Promise.all(promises);
}

export type CreateFileDocExtras = Omit<FileDocCreateData, "fid" | "overrides" | "links">;

export function createFileDoc(fid: string,
	name: string,
	links: Record<string, InlineLinkData>,
	extras?: CreateFileDocExtras
): Promise<DocumentReference<FileData>>;

export function createFileDoc(fid: string,
	name: string,
	links: Record<string, InlineLinkData>,
	extras: CreateFileDocExtras | undefined,
	transaction: Transaction
): DocumentReference<FileData>;

export function createFileDoc(fid: string,
	name: string,
	links: Record<string, InlineLinkData>,
	extras?: CreateFileDocExtras,
	transaction?: Transaction
) {
	const uid = getAuth().currentUser?.uid;
	if (!uid) throw new Error("User must be signed in before attempting to create new links");
	
	const docRef = getFileDocRef(createCFID(fid));
	const data: FileDocCreateData = {
		...extras,
		[FileField.USER]: { [UserSnapshotField.UID]: uid },
		[FileField.FID]: fid,
		[FileField.OVERRIDES]: { customMetadata: { name } },
		[FileField.LINKS]: links,
	};

	if (transaction) transaction.set(docRef, data, { merge: true });
	else return setDoc(docRef, data, { merge: true }).then(() => docRef);

	return docRef;
}

export async function updateFileDoc(ref: DocumentReference<FileData>, data: FileDocUpdateData) {
	return setDoc(ref, data);
}

export async function deleteFile(fid: string) {
	const fileKey = getFileKey(fid);
	const docRef = getFileDocRef(createCFID(fid));

	const dltObj = deleteObject(fileKey);
	const dltDoc = deleteDoc(docRef);
	return Promise.all([dltObj, dltDoc]);
}

export type FileDocCreateData = WithFieldValue<Pick<FileData, FileField.USER | FileField.FID | FileField.LINKS> & { [FileField.OVERRIDES]?: SettableFileOverrides }>;
export type FileDocUpdateData = WithFieldValue<Pick<FileData, FileField.LINKS> & { [FileField.OVERRIDES]?: SettableFileOverrides }>;

export type ThumbnailSize = "56x56" | "128x128" | "384x384" | "1024x1024";

export interface FIDComponents {
	uid: string,
	fileName: string,
}
export type InlineLinkData = OrderData;

export enum FileField {
	USER = "user",
	FID = "fid",
	LINKS = "links",
	OVERRIDES = "overrides",
	WARNS = "warnings",
}

export interface FileData {
	[FileField.USER]?: UserSnapshot,
	[FileField.FID]?: string;
	[FileField.LINKS]?: Record<string, InlineLinkData>;
	[FileField.OVERRIDES]?: FileOverrides;
	[FileField.WARNS]?: Warning[];
}

export type FileOverrides = Partial<Pick<FileMetadata, "contentDisposition" | "mimeType" | "size" | "uploadTimestamp">> & {
	customMetadata?: FileCustomMetadata,
}

export type SettableFileOverrides = Pick<FileOverrides, "customMetadata">;
