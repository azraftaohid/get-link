export enum BillingAddressField {
	NAME = "name",
	EMAIL = "email_address",
}

export interface BillingAddress {
	[BillingAddressField.EMAIL]?: string;
	[BillingAddressField.NAME]?: string;
}
