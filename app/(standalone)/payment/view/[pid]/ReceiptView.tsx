import { Image } from "@/components/Image";
import { Loading } from "@/components/Loading";
import { QueryEmptyView } from "@/components/QueryEmptyView";
import { QueryErrorView } from "@/components/QueryErrorView";
import { BillingInfoField } from "@/models/billings/billingInfo";
import { InvoiceSnapshotField } from "@/models/billings/invoice";
import { PaymentField, getPayment } from "@/models/billings/payment";
import { Price, strPrice } from "@/models/billings/price";
import { ProductMetadataField } from "@/models/billings/product";
import { SubscriptionField } from "@/models/billings/subscription";
import { UserSnapshotField } from "@/models/users";
import { quantityString } from "@/utils/quantityString";
import { DOMAIN } from "@/utils/urls";
import { useFirestoreDocument } from "@react-query-firebase/firestore";
import { Seconds, formatDate } from "@thegoodcompany/common-utils-js";
import { User } from "firebase/auth";
import React from "react";
import Table from "react-bootstrap/Table";

function ParaHead({ children }: Readonly<React.PropsWithChildren>) {
	return <strong className="d-block mt-3">{children}</strong>;
}

function ParaItem({ 
	label, 
	value 
}: Readonly<{ 
	label?: string, 
	value: React.ReactNode 
}>) {
	return <span className="d-block">{label && <span className="d-inline-block eight-em">{label}:</span>}{value}</span>;
}

function ProductRow({
	name,
	duration,
	price,
	isSubscription 
}: Readonly<{ 
	name: string,
	duration: number | undefined,
	price: Price | null | undefined,
	isSubscription?: boolean 
}>) {
	const durationDays = duration !== undefined && new Seconds(duration).toDays().value;
	return <tr>
		<td>{name}{isSubscription && <><br /><small>Subscription</small></>}</td>
		<td>{durationDays ? `${durationDays} ${quantityString("day", "days", durationDays)}` : "N/A"}</td>
		<td>{price ? strPrice(price) : "N/A"}</td>
	</tr>;
}

export const ReceiptView: React.FunctionComponent<ReceiptViewProps> = ({
	user,
	paymentId,
}) => {
	const payment = useFirestoreDocument(paymentId, getPayment(paymentId));
	if (payment.isLoading) return <Loading />;
	if (payment.isError) {
		console.error("Unable to fetch payment:", payment.error);
		return <QueryErrorView />;
	}

	const data = payment.data?.data();
	if (!data) return <QueryEmptyView>
		Please check for mistakes in the URL.
	</QueryEmptyView>;

	const payDate = data[PaymentField.CREATE_TIME];

	return <div>
		<div className="clearfix mb-3">
			<Image
				className="float-start"
				srcLight={"/brand.svg"}
				srcDark={"/brand-light.svg"}
				width={151.61}
				height={50}
				alt="Get-Link logo"
			/>
			<strong className="float-end align-middle">{DOMAIN}</strong>
		</div>
		<h2>Payment receipt</h2>
		<ParaItem label="Payment ID" value={paymentId} />
		{user && user?.uid === data[PaymentField.USER]?.[UserSnapshotField.UID] && <div>
			<ParaHead>Paid by</ParaHead>
			{user.displayName && <ParaItem value={user.displayName} />}
			{user.email && <ParaItem value={user.email} />}
		</div>}
		<div>
			<ParaHead>Summery</ParaHead>
			<ParaItem label="Invoice ID" value={data[PaymentField.INVOICE]?.[InvoiceSnapshotField.ID] || "N/A"} />
			<ParaItem label="Payment date" value={payDate && formatDate(payDate.toDate(), "short", "year", "month", "day", "hour", "minute")} />
			<ParaItem label="User account" value={user?.email || "N/A"} />
			<ParaItem label="Paid amount" value={strPrice(data) || "N/A"} />
		</div>
		<ParaHead>Cost table</ParaHead>
		<Table className="mt-2" bordered>
			<thead>
				<tr>
					<th>Name</th>
					<th>Duration</th>
					<th>Price</th>
				</tr>
			</thead>
			<tbody>
				{Object.entries(data[PaymentField.INVOICE]?.[InvoiceSnapshotField.PRODUCTS] || { }).map(([id, metadata]) => {
					if (id.startsWith("subscription")) {
						const snapshot = metadata[ProductMetadataField.SNAPSHOT];
						const billings = snapshot?.[SubscriptionField.BILLING];
						const subProds = snapshot?.[SubscriptionField.PRODUCTS] || { };

						return Object.entries(subProds).map(([subProdId, subProdMetadata]) => <ProductRow 
							key={subProdId}
							name={subProdMetadata[ProductMetadataField.NAME] || subProdId}
							duration={billings?.[BillingInfoField.CYCLE]}
							price={subProdMetadata[ProductMetadataField.PRICE]}
							isSubscription
						/>);
					}

					return <ProductRow 
						key={id} 
						name={metadata[ProductMetadataField.NAME] || id}
						duration={metadata[ProductMetadataField.DURATION]}
						price={metadata[ProductMetadataField.PRICE]}
					/>;
				})}
			</tbody>
			<tfoot>
				<tr>
					<th scope="row" colSpan={2}>Total paid</th>
					<td scope="col">{strPrice(data) || "N/A"}</td>
				</tr>
			</tfoot>
		</Table>
	</div>;
};

export interface ReceiptViewProps {
	user?: User | null,
	paymentId: string,
}
