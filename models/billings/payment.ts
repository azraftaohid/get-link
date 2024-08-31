import { getFunctions } from "@/utils/functions";
import { DOMAIN } from "@/utils/urls";
import { CollectionReference, FieldPath, Query, Timestamp, collection, doc, getFirestore, query, where } from "firebase/firestore";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { UserSnapshot, UserSnapshotField } from "../users";
import { InvoiceSnapshot } from "./invoice";
import { Price } from "./price";
import { ProductMetadata } from "./product";

export const COLLECTION_PAYMENT = "payments";

let getPaymentUrlFunc: HttpsCallable<GetPaymentUrlRequestData, GetPaymentUrlResponseData> | undefined;
let processPaymentFunc: HttpsCallable<ProcessPaymentRequestData, ProcessPaymentResponseData> | undefined;

export enum PaymentField {
	AMOUNT = "amount_cents",
	CURRENCY = "currency",
	INVOICE = "invoice",
	BKASH = "bKash",
	CREATE_TIME = "create_time",
	STATE = "state",
	REFUND = "refund",
	USER = "user",
}

export enum BKashPaymentInfoField {
	TRX_ID = "transaction_id",
	PAYMENT_ID = "payment_id",
	PAYMENT_TIME = "payment_execution_time",
}

export enum PaymentRefundField {
	REASON = "reason",
}

export function getPayments(): CollectionReference<PaymentData>;
export function getPayments(uid: string): Query<PaymentData>;
export function getPayments(uid?: string) {
	const col: CollectionReference<PaymentData> = collection(getFirestore(), COLLECTION_PAYMENT);
	if (!uid) return col;

	return query(col, where(new FieldPath(PaymentField.USER, UserSnapshotField.UID), "==", uid));
}

export function getPayment(pid: string) {
	return doc(getPayments(), pid);
}

export function getPaymentUrl(invoiceId: string) {
	if (!getPaymentUrlFunc)
		getPaymentUrlFunc = httpsCallable(getFunctions(), "payment-geturl");

	return getPaymentUrlFunc({ invoiceId });
}

export function getAppPaymentUrl(invoiceId: string) {
	return `${DOMAIN}/payment/pay/${invoiceId}`;
}

export function getPaymentViewUrl(paymentId: string) {
	return `${DOMAIN}/payment/view/${paymentId}`;
}

export function processPayment(paymentId: string) {
	if (!processPaymentFunc)
		processPaymentFunc = httpsCallable(getFunctions(), "payment-process");

	return processPaymentFunc({ paymentId });
}

interface GetPaymentUrlRequestData {
	invoiceId: string,
}

interface ProcessPaymentRequestData {
	paymentId: string,
}

export interface GetPaymentUrlResponseData {
	paymentUrl: string,
	payment: Price,
}

export interface ProcessPaymentResponseData {
	success: boolean,
	invoiceId: string,
	products: Record<string, ProductMetadata>,
	price: Price,
}

export type PaymentState = "pending_process" | "processed" | "refund_issued" | "refund_failed" | "no_payment_provider"

export interface BKashPaymentInfo {
	[BKashPaymentInfoField.PAYMENT_ID]?: string,
	[BKashPaymentInfoField.TRX_ID]?: string,
	[BKashPaymentInfoField.PAYMENT_TIME]?: Timestamp,
}

export interface PaymentRefund {
	[PaymentRefundField.REASON]?: string,
}

export type PaymentData = Price & {
	[PaymentField.INVOICE]?: InvoiceSnapshot,
	[PaymentField.CREATE_TIME]?: Timestamp,
	[PaymentField.BKASH]?: BKashPaymentInfo,
	[PaymentField.STATE]?: PaymentState,
	[PaymentField.REFUND]?: PaymentRefund,
	[PaymentField.USER]?: UserSnapshot,
};
