import { collection, CollectionReference, deleteDoc, doc, FieldPath, getFirestore, orderBy, Query, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore/lite";
import { getStorage, ref as fileRef, StorageReference } from "firebase/storage";
import { v5 } from "uuid";
import { extractDisplayName } from "../utils/strings";
import { Dimension } from "./dimension";
import { UserSnapshot, UserSnapshotField } from "./users";

/**
 * # Database structure
 * 
 * ## Definitions
 * 	- FID: unique file ID; often implies to the file path
 * 	- CFID: canonical file id; refers to the document that stores file metadata
 * 	- UID: shorten from User ID
 * 	- Name: name of the file, that comprises the display name + extension
 * 
 * ## Firestore
 * files/cfid { fid: FID }
 * 
 * ## Storage
 * user/uid/name
 */

const NAMESPACE_FILES = "d4f3fc99-23a2-447d-96d7-9b43861c19cc";

export function createEntryId(fid: string) {
	return v5(fid, NAMESPACE_FILES);
}

export function createFID(fileName: string, uid: string) {
	return `users/${uid}/${fileName}`;
}

export function getFileContentRef(fid: string): StorageReference;
export function getFileContentRef(fileName: string, uid: string): StorageReference;
export function getFileContentRef(s1: string, s2?: string) {
	return fileRef(getStorage(), s2 ? createFID(s1, s2) : s1);
}

export function getThumbnailContentRef(fid: string, size: ThumbnailSize) {
	const displayName = extractDisplayName(fid);
	return fileRef(getStorage(), `${displayName}_${size}.jpeg`);
}

export function getFiles(): CollectionReference<FileMetadata>;
export function getFiles(uid: string): Query<FileMetadata>;
export function getFiles(uid?: string) {
	const fs: CollectionReference<FileMetadata> = collection(getFirestore(), "files");
	if (!uid) return fs;

	return query(fs, where(new FieldPath(FileField.USER, UserSnapshotField.UID), "==", uid), 
		orderBy(FileField.CREATE_TIME, "desc"));
}

export function getFileRef(cfid?: string) {
	return doc(getFiles(), cfid);
}

export function getFileRefByFID(fid: string) {
	return getFileRef(createEntryId(fid));
}

export function getFileRefOf(ref: StorageReference) {
	return getFileRefByFID(ref.fullPath);
}

export async function captureFile(fid: string, uid: string, data?: Omit<FileMetadata, FileField.FID | FileField.USER | FileField.CREATE_TIME>) {
	const ref = getFileRefByFID(fid);

	await setDoc(ref, {
		...data,
		[FileField.FID]: fid,
		[FileField.USER]: { [UserSnapshotField.UID]: uid },
		[FileField.CREATE_TIME]: serverTimestamp(),
	});

	return ref;
}

export async function releaseFile(cfid: string) {
	const ref = getFileRef(cfid);
	await deleteDoc(ref);
}

export enum FileField {
	NAME = "name",
	FID = "fid",
	USER = "user",
	CREATE_TIME = "create_time",
	DIMENSION = "dimension",
}

export type ThumbnailSize = "56x56" | "128x128" | "384x384" | "1024x1024";

export interface FileMetadata {
	[FileField.NAME]?: string,
	[FileField.FID]?: string,
	[FileField.USER]?: UserSnapshot,
	[FileField.CREATE_TIME]?: Timestamp,
	[FileField.DIMENSION]?: Dimension,
}