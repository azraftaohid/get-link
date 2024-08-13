import { getFunctions } from "@/utils/functions";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { Price } from "./price";
import { ProductMetadata } from "./product";

let getPaymentUrlFunc: HttpsCallable<GetPaymentUrlRequestData, GetPaymentUrlResponseData> | undefined;
let processPaymentFunc: HttpsCallable<ProcessPaymentRequestData, ProcessPaymentResponseData> | undefined;

export function getPaymentUrl(invoiceId: string) {
	if (!getPaymentUrlFunc)
		getPaymentUrlFunc = httpsCallable(getFunctions(), "payment-geturl");

	return getPaymentUrlFunc({ invoiceId });
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
