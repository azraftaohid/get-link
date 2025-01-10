import { Image } from "@/components/Image";
import { InvoiceBreakdown } from "@/components/InvoiceBreakdown";
import { Loading } from "@/components/Loading";
import { QueryEmptyView } from "@/components/QueryEmptyView";
import { QueryErrorView } from "@/components/QueryErrorView";
import { InvoiceSnapshotField } from "@/models/billings/invoice";
import { PaymentField, getPayment } from "@/models/billings/payment";
import { PriceField, strPrice } from "@/models/billings/price";
import { UserSnapshotField } from "@/models/users";
import { DOMAIN } from "@/utils/urls";
import { useFirestoreDocument } from "@react-query-firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { User } from "firebase/auth";
import React from "react";

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
		<InvoiceBreakdown className="mt-2" snapshot={data[PaymentField.INVOICE] || {}} price={{
			...(data[PaymentField.INVOICE]?.[InvoiceSnapshotField.PAYMENT] || { }),
			[PriceField.AMOUNT_CENTS]: data[PriceField.AMOUNT_CENTS],
			[PriceField.CURRENCY]: data[PriceField.CURRENCY],
		}} totalText="Total paid" />
	</div>;
};

export interface ReceiptViewProps {
	user?: User | null,
	paymentId: string,
}
