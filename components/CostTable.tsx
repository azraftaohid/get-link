import { BillingInfoField } from "@/models/billings/billingInfo";
import { InvoiceData, InvoiceField } from "@/models/billings/invoice";
import { DiscountablePriceField, Price, strPrice } from "@/models/billings/price";
import { ProductMetadataField } from "@/models/billings/product";
import { SubscriptionField } from "@/models/billings/subscription";
import { mergeNames } from "@/utils/mergeNames";
import { quantityString } from "@/utils/quantityString";
import { Seconds } from "@thegoodcompany/common-utils-js";
import React from "react";
import Table, { TableProps } from "react-bootstrap/Table";

function ProductRow({
	sn,
	name,
	duration,
	price,
	isSubscription,
}: Readonly<{ 
	sn: number,
	name: string,
	duration: number | undefined,
	price: Price | null | undefined,
	isSubscription?: boolean 
}>) {
	const durationDays = duration !== undefined && new Seconds(duration).toDays().value;
	return <tr>
		<td>{sn.toString().padStart(2, "0")}</td>
		<td>{name}{isSubscription && <><br /><small>Subscription</small></>}</td>
		<td>{durationDays ? `${durationDays} ${quantityString("day", "days", durationDays)}` : "N/A"}</td>
		<td>{price ? strPrice(price) : "N/A"}</td>
	</tr>;
}

export const CostTable: React.FunctionComponent<CostTableProps> = ({
	className,
	data, 
	totalText = "Total",
	...rest
}) => {
	const payment = data[InvoiceField.PAYMENT] || { };
	const discount = payment[DiscountablePriceField.DISCOUNT];
	const subtotal = payment[DiscountablePriceField.SUBTOTAL];

	let sn = 1;
	return <Table className={mergeNames(className)} bordered {...rest}>
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>Duration</th>
				<th>Price</th>
			</tr>
		</thead>
		<tbody>
			{Object.entries(data[InvoiceField.PRODUCTS] || {}).map(([id, metadata]) => {
				if (id.startsWith("subscription")) {
					const snapshot = metadata[ProductMetadataField.SNAPSHOT];
					const billings = snapshot?.[SubscriptionField.BILLING];
					const subProds = snapshot?.[SubscriptionField.PRODUCTS] || {};

					return Object.entries(subProds).map(([subProdId, subProdMetadata]) => <ProductRow
						key={subProdId}
						sn={sn++}
						name={subProdMetadata[ProductMetadataField.NAME] || subProdId}
						duration={billings?.[BillingInfoField.CYCLE]}
						price={subProdMetadata[ProductMetadataField.PRICE]}
						isSubscription
					/>);
				}

				return <ProductRow
					key={id}
					sn={sn++}
					name={metadata[ProductMetadataField.NAME] || id}
					duration={metadata[ProductMetadataField.DURATION]}
					price={metadata[ProductMetadataField.PRICE]}
				/>;
			})}
		</tbody>
		<tfoot>
			<tr>
				<td scope="row" colSpan={3}>Subtotal</td>
				<td scope="col">{(subtotal && strPrice(subtotal)) || "N/A"}</td>
			</tr>
			<tr>
				<td scope="row" colSpan={3}>Discount</td>
				<td scope="col">{(discount && strPrice(discount)) || "N/A"}</td>
			</tr>
			<tr>
				<th scope="row" colSpan={3}>{totalText}</th>
				<td scope="col">{strPrice(payment) || "N/A"}</td>
			</tr>
		</tfoot>
	</Table>;
};

export type CostableData = Pick<InvoiceData, InvoiceField.PRODUCTS | InvoiceField.TRADE_INS | InvoiceField.PAYMENT>;

export interface CostTableProps extends TableProps, React.RefAttributes<HTMLTableElement> {
	data: CostableData,
	totalText?: string,
}
