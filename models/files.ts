import { StorageReference, ref as fileRef, getStorage } from "firebase/storage";
import { compartFid, extractDisplayName } from "../utils/strings";

export function createFID(fileName: string, uid: string) {
	return `users/${uid}/${fileName}`;
}

export function getFileRef(fid: string): StorageReference;
export function getFileRef(fileName: string, uid: string): StorageReference;
export function getFileRef(s1: string, s2?: string) {
	return fileRef(getStorage(), s2 ? createFID(s1, s2) : s1);
}

export function getThumbnailRef(fid: string, size: ThumbnailSize) {
	const { uid, fileName } = compartFid(fid);
	const displayName = extractDisplayName(fileName);

	return fileRef(getStorage(), `users/${uid}/thumbs/${displayName}_${size}.jpeg`);
}

export type ThumbnailSize = "56x56" | "128x128" | "384x384" | "1024x1024";

export interface FIDComponents {
	uid: string,
	fileName: string,
}
