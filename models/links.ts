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
	where,
	WithFieldValue
} from "firebase/firestore";
import { v4 as uuidV4 } from "uuid";
import { ensureProperty } from "../utils/objects";
import { createCFID, FileData, FileField } from "./files";
import { LinkCover } from "./linkCover";
import { OrderData, OrderField } from "./order";
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
	return doc(getLinks(), linkId || uuidV4());
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
	if (transaction) transaction.set(ref, data, { merge: true });
	else return setDoc(ref, data, { merge: true });
}

export async function releaseLink(linkId: string) {
	const ref = getLinkRef(linkId);
	await deleteDoc(ref);
}

export async function detachFileFromLink(fid: string, link: string) {
	const ref = getLinkRef(link);
	return updateLink(ref, {
		[LinkField.FILES]: {
			[createCFID(fid)]: deleteField(),
		},
	});
}

export class Link {
	readonly ref: DocumentReference<LinkData>;
	readonly data: WithFieldValue<LinkData> = { };

	private lock = false;

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

	public setTitle(title: string) {
		this.data[LinkField.TITLE] = title;
	}

	public setCover(cover?: LinkCover) {
		this.data[LinkField.COVER] = cover || deleteField();
	}

	public getCover(): WithFieldValue<LinkCover> | undefined {
		const value = this.data[LinkField.COVER];
		return value instanceof FieldValue ? undefined : value;
	}

	public pushFile(fid: string, pos: number, data?: Omit<InlineFileData, OrderField.CREATE_ORDER>) {
		const files = ensureProperty(this.data, LinkField.FILES, { });
		files[createCFID(fid)] = {
			...data,
			[FileField.FID]: fid,
			[OrderField.CREATE_ORDER]: pos
		};
	}

	public removeFile(fid: string) {
		const files = ensureProperty(this.data, LinkField.FILES, { });
		files[createCFID(fid)] = deleteField();
	}

	public update() {
		if (this.lock) throw new Error("Link instance already applied once or is being applied.");
		this.lock = true;
		
		const updateData: LinkUpdateData = this.extractData(
			LinkField.TITLE, LinkField.FILES, LinkField.EXPIRE_TIME, LinkField.COVER
		);

		return updateLink(this.ref, updateData).catch((err) => {
			this.lock = false;
			throw err;
		});
	}

	public create(title: string) {
		if (this.lock) throw new Error("Link instance already applied once or is being applied.");
		this.lock = true;

		const createData: LinkCreateData = this.extractData(
			LinkField.COVER, LinkField.FILES, LinkField.EXPIRE_TIME, LinkField.COVER,
		);

		return createLink(title, this.ref, createData).catch((err) => {
			this.lock = false;
			throw err;
		});
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

export type InlineFileData = Omit<FileData, "links"> & OrderData;

type LinkCreateField = LinkField.TITLE | LinkField.USER | LinkField.COVER | LinkField.FILES | LinkField.CREATE_TIME | LinkField.EXPIRE_TIME;
type LinkUpdateField = LinkField.TITLE | LinkField.COVER | LinkField.FILES;

export type LinkStatus = "links:create-failed";

export type Warning = "executable";

export type LinkCreateData = WithFieldValue<Pick<LinkData, LinkCreateField>>;
export type LinkUpdateData = WithFieldValue<Pick<LinkData, LinkUpdateField>>;

/**
 * Location: firestore/links/{lid}  
 * Only tier 0 subscribers would populate the `LinkField.FIDS` field.
 */
export interface LinkData {
	[LinkField.TITLE]?: string;
	[LinkField.USER]?: UserSnapshot;
	[LinkField.COVER]?: LinkCover;
	[LinkField.FILES]?: Record<string, InlineFileData>;
	[LinkField.CREATE_TIME]?: Timestamp;
	[LinkField.EXPIRE_TIME]?: Timestamp;
}
