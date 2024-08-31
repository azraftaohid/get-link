import { ExpandButton } from "@/components/ExpandButton";
import { Loading } from "@/components/Loading";
import { PaymentData, PaymentField, getPaymentViewUrl, getPayments } from "@/models/billings/payment";
import { strPrice } from "@/models/billings/price";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { QueryDocumentSnapshot, QuerySnapshot, limit, orderBy, query, startAfter } from "firebase/firestore";
import React, { useMemo } from "react";
import Table from "react-bootstrap/Table";
import { EmptyView, ErrorView } from "./helperComponents";

const INIT_FETCH_LIMIT = 4;
const SUBS_FETCH_LIMIT = 8;

const PaymentRow: React.FunctionComponent<{ snapshot: QueryDocumentSnapshot<PaymentData>, }> = ({
	snapshot,
}) => {
	const data = snapshot.data();
	const paymentId = snapshot.id;
	const createTime = data[PaymentField.CREATE_TIME];
	const cost = strPrice(data);

	return <tr role="button" onClick={() => window.open(getPaymentViewUrl(paymentId), "_blank")}>
		<td>{createTime ? formatDate(createTime.toDate(), "short", "year", "month", "day", "hour", "minute") : "N/A"}</td>
		<td>{paymentId}</td>
		<td>{cost || "N/A"}</td>
	</tr>;
};

const PaymentRows: React.FunctionComponent<{ snapshot: QuerySnapshot<PaymentData> }> = ({
	snapshot,
}) => {
	return <>
		{snapshot.docs.map((value) => <PaymentRow key={value.id} snapshot={value} />)}
	</>;
};

export const PaymentList: React.FunctionComponent<PaymentListProps> = ({
	uid,
}) => {
	const baseQuery = useMemo(() => {
		return query(getPayments(uid), 
			orderBy(PaymentField.CREATE_TIME, "desc"), 
			limit(INIT_FETCH_LIMIT)
		);
	}, [uid]);

	const payments = useFirestoreInfiniteQuery(`payments-${uid}`, baseQuery, (snapshot) => {
		if (snapshot.size !== INIT_FETCH_LIMIT && snapshot.size !== SUBS_FETCH_LIMIT) return undefined;

		const lastDoc = snapshot.docs[snapshot.size - 1];
		return query(baseQuery, startAfter(lastDoc));
	});

	if (payments.isLoading) return <Loading />;

	if (payments.isError) {
		console.error("Error fetching payments:", payments.error);
		return <ErrorView />;
	}

	if (!payments.data?.pages[0].size) {
		return <EmptyView>
			Once you make a payment, it&apos;ll show up here.
		</EmptyView>;
	}

	return <>
		<Table className="mb-0" bordered hover>
			<thead>
				<tr>
					<th scope="col">Date</th>
					<th scope="col">Payment ID</th>
					<th scope="col">Amount</th>
				</tr>
			</thead>
			<tbody>
				{payments.data.pages.map((page) => <PaymentRows 
					key={page.docs[0].id + page.docs[page.size - 1].id} 
					snapshot={page} 
				/>)}
			</tbody>
		</Table>
		<ExpandButton
			className="mt-4"
			state={payments.isLoading || payments.isFetching ? "loading" : "none"}
			onClick={() => payments.fetchNextPage()}
			disabled={!payments.hasNextPage || !payments.isSuccess}
		>
			{payments.hasNextPage ? "Load more" : "End"}
		</ExpandButton>
	</>;
};

export interface PaymentListProps {
	uid: string,
}
