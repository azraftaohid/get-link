import { Price } from "./price";
import { SubscriptionSnapshot } from "./subscription";

export enum ProductMetadataField {
	NAME = "name",
	PRICE = "price",
	DURATION = "duration_s",
	SNAPSHOT = "snapshot",
}

export interface ProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]?: Price | null,
	[ProductMetadataField.DURATION]?: number,
	[ProductMetadataField.SNAPSHOT]?: SubscriptionSnapshot,
}

export interface ComputedProductMetadata {
	[ProductMetadataField.NAME]?: string,
	[ProductMetadataField.PRICE]: Required<Price> | null,
	[ProductMetadataField.DURATION]?: number,
	[ProductMetadataField.SNAPSHOT]?: SubscriptionSnapshot,
}
