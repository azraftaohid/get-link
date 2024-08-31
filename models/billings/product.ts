import { Price } from "./price";

export enum ProductMetadataField {
	NAME = "name",
	PRICE = "price",
	DURATION = "duration_s",
}

export interface ProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]?: Price | null,
	[ProductMetadataField.DURATION]?: number,
}

export interface ComputedProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]: Required<Price> | null,
	[ProductMetadataField.DURATION]?: number,
}
