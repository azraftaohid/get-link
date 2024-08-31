import { Timestamp } from "firebase/firestore";

export enum BillingInfoField {
	CYCLE = "cycle_s",
	LAST_PAYMENT_TIME = "last_payment_time",
	NEXT_PAYMENT_TIME = "next_payment_time",
	NEXT_PAYMENT_INVOICE_ID = "next_payment_invoice_id",
}

export interface BillingInfo {
	[BillingInfoField.CYCLE]?: number,
	[BillingInfoField.LAST_PAYMENT_TIME]?: Timestamp,
	[BillingInfoField.NEXT_PAYMENT_TIME]?: Timestamp,
	[BillingInfoField.NEXT_PAYMENT_INVOICE_ID]?: string | null,
}
