import { Price } from "./price";
import { RecurrenceOptions } from "./recurrence";

export enum ProductMetadataField {
	NAME = "name",
	PRICE = "price",
	DURATION = "duration_s",
	RECURRENCE = "recurrence",
}

export interface ProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]?: Price | null,
	[ProductMetadataField.DURATION]?: number,
	[ProductMetadataField.RECURRENCE]?: RecurrenceOptions,
}

export interface ComputedProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]: Required<Price> | null,
	[ProductMetadataField.DURATION]?: number,
	[ProductMetadataField.RECURRENCE]?: RecurrenceOptions,
}
