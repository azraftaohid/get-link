import { now } from "@/utils/dates";
import { User } from "firebase/auth";
import { CollectionReference, Timestamp, WithFieldValue, collection, deleteField, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { UserSnapshot, UserSnapshotField } from "../users";
import { BillingAddress, BillingAddressField } from "./billingAddress";
import { DiscountablePrice, Price } from "./price";
import { ComputedProductMetadata, ProductMetadata, ProductMetadataField } from "./product";

export enum InvoiceField {
	PRODUCTS = "products",
	TRADE_INS = "trade_ins",
	PAYMENT = "payment",
	USER = "user",
	CREATE_TIME = "create_time",
	EXPIRE_TIME = "expire_time",
	BILLING_ADDRESS = "billing_address",
}

export enum InvoiceSnapshotField {
	ID = "id",
	CREATE_TIME = "create_time",
	PRODUCTS = "products",
	TRADE_INS = "trade_ins",
	USER = "user",
	BILLING_ADDRESS = "billing_address",
}

export enum InvoicePaymentObjField {
	DUE_TIME = "due_time",
	STATUS = "status",
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
		...(options.tradeIns && { [InvoiceField.TRADE_INS]: options.tradeIns }),
		[InvoiceField.CREATE_TIME]: serverTimestamp(),
		[InvoiceField.EXPIRE_TIME]: Timestamp.fromMillis(now() + 86400000), // 24 hours from now
		[InvoiceField.USER]: {
			[UserSnapshotField.UID]: user.uid,
		}
	};

	const docRef = doc(getInvoices(), createInvoiceId());
	await setDoc(docRef, data);
	return docRef;
}

export async function updateInvoice(invoiceId: string, options: InvoiceUpdateOptions) {
	const data: WithFieldValue<InvoiceData> = {
		[InvoiceField.BILLING_ADDRESS]: options.billing_address ? {
			...options.billing_address,
			[BillingAddressField.NAME]: options.billing_address[BillingAddressField.NAME] || deleteField(),
			[BillingAddressField.EMAIL]: options.billing_address[BillingAddressField.EMAIL] || deleteField(),
		} : deleteField(),
	};

	const docRef = doc(getInvoices(), invoiceId);
	await setDoc(docRef, data, { merge: true });
	return docRef;
}

export interface InvoiceCreateOptions {
	products: Record<string, Required<Pick<ProductMetadata, ProductMetadataField.NAME>> 
		& Pick<ProductMetadata, ProductMetadataField.DURATION>>,
	tradeIns?: Record<string, Required<Pick<ProductMetadata, ProductMetadataField.NAME>>>,
}

export interface InvoiceUpdateOptions {
	billing_address?: BillingAddress,
}

export interface InvoicePaymentObj extends DiscountablePrice {
	[InvoicePaymentObjField.DUE_TIME]?: Timestamp,
	[InvoicePaymentObjField.STATUS]?: "awaiting" | "paid" | "cancelled",
}

export interface InvoiceData {
	// product ids: quota:tier1-xyz, quota:scope:dim:limit, quota:storage:space:50, quota:filedocs:write:1
	[InvoiceField.PRODUCTS]?: Record<string, ProductMetadata>,
	[InvoiceField.TRADE_INS]?: Record<string, ProductMetadata>,
	[InvoiceField.PAYMENT]?: InvoicePaymentObj,
	[InvoiceField.USER]?: UserSnapshot,
	[InvoiceField.CREATE_TIME]?: Timestamp,
	[InvoiceField.EXPIRE_TIME]?: Timestamp,
	[InvoiceField.BILLING_ADDRESS]?: BillingAddress,
}

export interface ComputedInvoiceData {
	[InvoiceField.PRODUCTS]: Record<string, ComputedProductMetadata>,
	[InvoiceField.TRADE_INS]?: Record<string, ProductMetadata>,
	[InvoiceField.PAYMENT]: Required<Price> & InvoicePaymentObj,
	[InvoiceField.USER]?: UserSnapshot,
	[InvoiceField.CREATE_TIME]?: Timestamp,
	[InvoiceField.EXPIRE_TIME]?: Timestamp,
	[InvoiceField.BILLING_ADDRESS]?: BillingAddress,
}

export interface InvoiceSnapshot {
	[InvoiceSnapshotField.ID]?: string,
	[InvoiceSnapshotField.PRODUCTS]?: Record<string, ProductMetadata>,
	[InvoiceSnapshotField.TRADE_INS]?: Record<string, ProductMetadata>,
	[InvoiceSnapshotField.BILLING_ADDRESS]?: BillingAddress,
}
