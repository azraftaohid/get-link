import { DocumentReference, Timestamp, collection, doc, getFirestore } from "firebase/firestore";

export enum AddonsField {
	QUOTAS = "quotas",
}

export enum AddonMetadataField {
	EXPIRE_TIME = "expire_time",
}

export const COLLECTION_ADDONS = "addons";

export function getAddons(uid: string): DocumentReference<Addons> {
	const col = collection(getFirestore(), COLLECTION_ADDONS);
	return doc(col, uid);
}

export interface AddonMetadata {
	[AddonMetadataField.EXPIRE_TIME]?: Timestamp,
}

export type AddonMap = Record<string, AddonMetadata>;

export type AddonGroup = Record<string, AddonMap>;

export interface Addons {
	[AddonsField.QUOTAS]?: AddonGroup,
}
