export enum PriceField {
	CURRENCY = "currency",
	AMOUNT_CENTS = "amount_cents",
}

export enum DiscountablePriceField {
	SUBTOTAL = "subtotal",
	DISCOUNT = "discount",
}

export function strPrice(price: Required<Price>): string;
export function strPrice(price: Price): string | null;
export function strPrice(price: Price): string | null {
	const amount = price[PriceField.AMOUNT_CENTS];
	const currency = price[PriceField.CURRENCY] || "BDT";

	return amount !== undefined ? `${amount / 100} ${currency}` : null;
}

export interface Price {
	[PriceField.CURRENCY]?: "BDT",
	[PriceField.AMOUNT_CENTS]?: number,
}

export interface DiscountablePrice extends Price {
	[DiscountablePriceField.SUBTOTAL]?: Price,
	[DiscountablePriceField.DISCOUNT]?: Price,
}
