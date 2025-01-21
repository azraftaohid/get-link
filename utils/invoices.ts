import { ComputedInvoiceData } from "@/models/billings/invoice";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { getFunctions } from "./functions";

let requireFunc: HttpsCallable<RequireInvoiceRequestData, ComputedInvoiceData>;

export async function requireInvoice(invoiceId: string) {
	if (!requireFunc)
		requireFunc = httpsCallable(getFunctions(), "invoice-compute");

	return requireFunc({ invoiceId });
}

export function createInvoiceUrl(id: string) {
	return "/invoice/" + id;
}

interface RequireInvoiceRequestData {
	invoiceId: string,
}
