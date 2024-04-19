import { CollectionReference, collection, doc, getFirestore } from "firebase/firestore";

export enum ShortlinkField {
	TARGET = "target",
}

export enum ShortlinkTargetField {
	PATH = "path",
}

export const COLLECTION_SHORTLINK = "shortlinks";

export function getShortlinks(): CollectionReference<ShortlinkData> {
	return collection(getFirestore(), COLLECTION_SHORTLINK);
}

export function getShortlink(id: string) {
	return doc(getShortlinks(), id);
}

export interface ShortlinkTarget {
	[ShortlinkTargetField.PATH]?: string,
}

export interface ShortlinkData {
	[ShortlinkField.TARGET]?: ShortlinkTarget,
}
