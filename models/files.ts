import { getStorage, ref as fileRef, StorageReference } from "firebase/storage";
import { extractDisplayName } from "../utils/strings";

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

export type ThumbnailSize = "56x56" | "128x128" | "384x384" | "1024x1024";
