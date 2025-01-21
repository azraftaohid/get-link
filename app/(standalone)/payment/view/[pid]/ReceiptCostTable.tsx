import { CostTable, CostTableProps } from "@/components/CostTable";
import { Loading } from "@/components/Loading";
import { QueryEmptyView } from "@/components/QueryEmptyView";
import { QueryErrorView } from "@/components/QueryErrorView";
import { getInvoice, InvoiceField, InvoiceSnapshotField } from "@/models/billings/invoice";
import { PaymentData, PaymentField } from "@/models/billings/payment";
import { PriceField } from "@/models/billings/price";
import { useFirestoreDocument } from "@react-query-firebase/firestore";

export const ReceiptCostTable: React.FunctionComponent<ReceiptCostTableProps> = ({
	paymentData,
	...rest
}) => {
	const invoiceId = paymentData[PaymentField.INVOICE]?.[InvoiceSnapshotField.ID] || "";
	const invoice = useFirestoreDocument([invoiceId], getInvoice(invoiceId));
	if (invoice.isLoading) return <Loading />;
	if (invoice.isError) {
		console.error("Unable to fetch invoice:", invoice.error);
		return <QueryErrorView />;
	}
	
	const invoiceData = invoice.data?.data();
	if (!invoiceData) {
		console.error("No data found in invoice:", invoiceId);
		return <QueryEmptyView>
				We can&apos;t display cost breakdown because we couldn&apos;t find the associated invoice.
			</QueryEmptyView>;
	}

	return <CostTable 
		totalText="Total paid"
		data={{
			...invoiceData,
			[InvoiceField.PAYMENT]: {
				...invoiceData[InvoiceField.PAYMENT],
				[PriceField.AMOUNT_CENTS]: paymentData[PriceField.AMOUNT_CENTS],
				[PriceField.CURRENCY]: paymentData[PriceField.CURRENCY],
			},
		}} 
		{...rest} />;
};

export interface ReceiptCostTableProps extends Omit<CostTableProps, "data"> {
	paymentData: PaymentData,
}
