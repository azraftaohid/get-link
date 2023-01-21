import {
	collection,
	CollectionReference,
	deleteDoc,
	doc,
	FieldPath,
	getFirestore,
	orderBy,
	Query,
	query,
	serverTimestamp,
	setDoc,
	Timestamp,
	where,
} from "firebase/firestore/lite";
import { StorageReference } from "firebase/storage";
import { v5 } from "uuid";
import { FileCustomMetadata } from "../utils/files";
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
 * links/cfid { fids: FID[] }
 *
 * ## Storage
 * user/uid/name
 */

export const COLLECTION_LINKS = "links";

const NAMESPACE_LINKS = "d4f3fc99-23a2-447d-96d7-9b43861c19cc";

export function createCFID(fid: string) {
	return v5(fid, NAMESPACE_LINKS);
}

export function getLinks(): CollectionReference<LinkData>;
export function getLinks(uid: string): Query<LinkData>;
export function getLinks(uid?: string) {
	const links: CollectionReference<LinkData> = collection(getFirestore(), COLLECTION_LINKS);
	if (!uid) return links;

	return query(
		links,
		where(new FieldPath(LinkField.USER, UserSnapshotField.UID), "==", uid),
		orderBy(LinkField.CREATE_TIME, "desc")
	);
}

export function getLinkRef(cfid?: string) {
	return doc(getLinks(), cfid);
}

export function getLinkRefByFID(fid: string) {
	return getLinkRef(createCFID(fid));
}

export function getLinkRefOf(ref: StorageReference) {
	return getLinkRefByFID(ref.fullPath);
}

export async function createLink(
	fid: string,
	uid: string,
	data?: Omit<LinkData, LinkField.FID | LinkField.USER | LinkField.CREATE_TIME>
) {
	const ref = getLinkRefByFID(fid);
	await setDoc(ref, {
		...data,
		[LinkField.FID]: fid,
		[LinkField.USER]: { [UserSnapshotField.UID]: uid },
		[LinkField.CREATE_TIME]: serverTimestamp(),
	});

	return ref;
}

export async function releaseLink(cfid: string) {
	const ref = getLinkRef(cfid);
	await deleteDoc(ref);
}

export enum LinkField {
	TITLE = "title",
	NAME = "name",
	FID = "fid",
	USER = "user",
	CREATE_TIME = "create_time",
	EXPIRE_TIME = "expire_time",
	FILE = "file",
	WARNS = "warnings",
}

export type Warning = "executable";

export interface LinkData {
	[LinkField.TITLE]?: string;
	[LinkField.NAME]?: string;
	[LinkField.FID]?: string;
	[LinkField.USER]?: UserSnapshot;
	[LinkField.CREATE_TIME]?: Timestamp;
	[LinkField.EXPIRE_TIME]?: Timestamp;
	[LinkField.WARNS]?: Warning[];
	[LinkField.FILE]?: FileCustomMetadata;
}
