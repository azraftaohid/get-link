import { getAuth } from "firebase/auth";
import {
	collection,
	CollectionReference,
	deleteDoc,
	deleteField,
	doc,
	DocumentReference,
	FieldPath,
	FieldValue,
	getFirestore,
	orderBy,
	Query,
	query, serverTimestamp,
	setDoc,
	Timestamp,
	Transaction,
	updateDoc,
	where,
	WithFieldValue
} from "firebase/firestore/lite";
import { ensureProperty } from "../utils/objects";
import { File } from "./files";
import { LinkCover } from "./linkCover";
import { UserSnapshot, UserSnapshotField } from "./users";

/**
 * # Database structure
 *
 * ## Definitions
 * 	- UID: shorten from User ID
 *
 * ## Firestore
 * links/link { ..., title, cover, expire_time, ... }
 * 
 */

export const COLLECTION_LINKS = "links";

export const MAX_LEN_LINK_TITLE = 255;

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

/**
 * Creates reference of an existing link document or creates a new reference when `linkId` is ommited.
 * @param linkId Name of the link document
 * @returns The reference object
 */
export function getLinkRef(linkId?: string) {
	return linkId ? doc(getLinks(), linkId) : doc(getLinks());
}

export function createLink(title: string, ref?: DocumentReference<LinkData>, data?: LinkCreateData): Promise<DocumentReference<LinkData>>;
export function createLink(title: string, ref?: DocumentReference<LinkData>, data?: LinkCreateData, transaction?: Transaction): DocumentReference<LinkData>;
export function createLink(title: string, ref: DocumentReference<LinkData> = getLinkRef(), data?: LinkCreateData, transaction?: Transaction) {
	const uid = getAuth().currentUser?.uid;
	if (!uid) throw new Error("User must be signed in before attempting to create new links");

	const d = {
		...data,
		[LinkField.TITLE]: title,
		[LinkField.USER]: { [UserSnapshotField.UID]: uid },
		[LinkField.CREATE_TIME]: serverTimestamp(),
	};

	if (transaction) transaction.set(ref, d);
	else return setDoc(ref, d).then(() => ref);

	return ref;
}

export function updateLink(ref: DocumentReference<LinkData>, data: LinkUpdateData): Promise<void>;
export function updateLink(ref: DocumentReference<LinkData>, data: LinkUpdateData, transaction: Transaction): void;
export function updateLink(ref: DocumentReference<LinkData>, data: LinkUpdateData, transaction?: Transaction) {
	if (transaction) transaction.update(ref, data);
	else return updateDoc(ref, data);
}

export async function releaseLink(linkId: string) {
	const ref = getLinkRef(linkId);
	await deleteDoc(ref);
}

export class Link {
	readonly ref: DocumentReference<LinkData>;
	readonly data: WithFieldValue<LinkData> = { };

	constructor(ref?: DocumentReference<LinkData>) {
		this.ref = ref || getLinkRef();
	}

	private extractData<K extends keyof WithFieldValue<LinkData>>(...fields: K[]): { [KEY in K]: WithFieldValue<LinkData>[KEY] } {
		const result: Record<string, unknown> = { };
		fields.forEach(field => {
			const value = this.data[field];
			if (value) result[field] = value;
		});

		return result as { [KEY in K]: WithFieldValue<LinkData>[KEY] };
	}

	public setCover(cover?: LinkCover) {
		this.data[LinkField.COVER] = cover || deleteField();
	}

	public getCover(): WithFieldValue<LinkCover> | undefined {
		const value = this.data[LinkField.COVER];
		return value instanceof FieldValue ? undefined : value;
	}

	public pushFile(fid: string, data?: PushFileData) {
		const files = ensureProperty(this.data, LinkField.FILES, { });
		files[fid] = data || { };
	}

	public removeFile(fid: string) {
		const files = ensureProperty(this.data, LinkField.FILES, { });
		files[fid] = deleteField();
	}

	public update() {
		const updateData: LinkUpdateData = this.extractData(LinkField.COVER, LinkField.EXPIRE_TIME);
		return updateLink(this.ref, updateData);
	}

	public create(title: string) {
		const createData: LinkCreateData = this.extractData(LinkField.COVER, LinkField.FILES, LinkField.EXPIRE_TIME);
		return createLink(title, this.ref, createData);
	}
}

export enum LinkField {
	TITLE = "title",
	USER = "user",
	COVER = "cover",
	FILES = "files",
	CREATE_TIME = "create_time",
	EXPIRE_TIME = "expire_time",
}

type PushFileData = Omit<File, "fid" | "links">

type LinkCreateField = LinkField.TITLE | LinkField.USER | LinkField.COVER | LinkField.FILES | LinkField.CREATE_TIME | LinkField.EXPIRE_TIME;
type LinkUpdateField = LinkField.TITLE | LinkField.COVER | LinkField.FILES;

export type LinkStatus = "links:create-failed";

export type Warning = "executable";

export type LinkCreateData = WithFieldValue<Pick<LinkData, LinkCreateField>>;
export type LinkUpdateData = WithFieldValue<Pick<LinkData, LinkUpdateField>>;

/**
 * Location: firestore/links/{link_id}  
 * Only tier 0 subscribers would populate the `LinkField.FIDS` field.
 */
export interface LinkData {
	[LinkField.TITLE]?: string;
	[LinkField.USER]?: UserSnapshot;
	[LinkField.COVER]?: LinkCover,
	[LinkField.FILES]?: Record<string, PushFileData>,
	[LinkField.CREATE_TIME]?: Timestamp;
	[LinkField.EXPIRE_TIME]?: Timestamp;
}
