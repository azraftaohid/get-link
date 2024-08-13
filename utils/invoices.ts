import { InvoiceData } from "@/models/billings.ts/invoice";
import { HttpsCallable, httpsCallable } from "firebase/functions";
import { getFunctions } from "./functions";

let requireFunc: HttpsCallable<RequireInvoiceRequestData, Required<InvoiceData>>;

export async function requireInvoice(invoiceId: string) {
	if (!requireFunc)
		requireFunc = httpsCallable(getFunctions(), "invoices-require");

	return requireFunc({ invoiceId });
}

export function createInvoiceUrl(id: string) {
	return "/invoice/" + id;
}

interface RequireInvoiceRequestData {
	invoiceId: string,
}
