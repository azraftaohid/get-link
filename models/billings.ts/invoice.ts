import { now } from "@/utils/dates";
import { User } from "firebase/auth";
import { CollectionReference, Timestamp, WithFieldValue, collection, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { UserSnapshot, UserSnapshotField } from "../users";
import { Price } from "./price";
import { ComputedProductMetadata, ProductMetadata, ProductMetadataField } from "./product";

export enum InvoiceField {
	PRODUCTS = "products",
	PAYMENT = "payment",
	USER = "user",
	CREATE_TIME = "create_time",
	EXPIRE_TIME = "expire_time",
}

export const COLLECTION_INVOICE = "invoices";

export function getInvoices(): CollectionReference<InvoiceData> {
	return collection(getFirestore(), COLLECTION_INVOICE);
}

export function createInvoiceId() {
	return nanoid(21);
}

export async function createInvoice(user: User, options: InvoiceCreateOptions) {
	const data: WithFieldValue<InvoiceData> = {
		[InvoiceField.PRODUCTS]: options.products,
		[InvoiceField.CREATE_TIME]: serverTimestamp(),
		[InvoiceField.EXPIRE_TIME]: Timestamp.fromMillis(now() + 2592000000), // 30 days from now
		[InvoiceField.USER]: {
			[UserSnapshotField.UID]: user.uid,
		}
	};

	const docRef = doc(getInvoices(), createInvoiceId());
	await setDoc(docRef, data);
	return docRef;
}

export interface InvoiceCreateOptions {
	products: Record<string, Pick<ProductMetadata, ProductMetadataField.RECURRENCE> & 
		Required<Pick<ProductMetadata, ProductMetadataField.NAME | ProductMetadataField.DURATION>>>,
}

export interface InvoiceData {
	// product ids: quota:tier1-xyz, quota:scope:dim:limit, quota:storage:space:50, quota:filedocs:write:1
	[InvoiceField.PRODUCTS]?: Record<string, ProductMetadata>,
	[InvoiceField.PAYMENT]?: Price & { status?: "awaiting" | "paid" | "canceled" },
	[InvoiceField.USER]?: UserSnapshot,
	[InvoiceField.CREATE_TIME]?: Timestamp,
	[InvoiceField.EXPIRE_TIME]?: Timestamp,
}

export interface ComputedInvoiceData {
	[InvoiceField.PRODUCTS]: Record<string, ComputedProductMetadata>,
	[InvoiceField.PAYMENT]: Required<Price>,
	[InvoiceField.USER]?: UserSnapshot,
	[InvoiceField.CREATE_TIME]?: Timestamp,
	[InvoiceField.EXPIRE_TIME]?: Timestamp,
}
