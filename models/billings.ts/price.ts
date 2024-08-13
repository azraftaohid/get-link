export enum PriceField {
	CURRENCY = "currency",
	AMOUNT_CENTS = "amount_cents",
}

export interface Price {
	[PriceField.CURRENCY]?: "BDT",
	[PriceField.AMOUNT_CENTS]?: number,
}
