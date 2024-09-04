import { Button, ButtonProps } from "@/components/Button";
import { ExpandButton } from "@/components/ExpandButton";
import { Loading } from "@/components/Loading";
import { QueryEmptyView } from "@/components/QueryEmptyView";
import { QueryErrorView } from "@/components/QueryErrorView";
import { BillingInfoField } from "@/models/billings/billingInfo";
import { getAppPaymentUrl } from "@/models/billings/payment";
import { PriceField } from "@/models/billings/price";
import { ProductMetadataField } from "@/models/billings/product";
import { Subscription, SubscriptionField, SubscriptionState, friendlySubscriptionState, getSubscriptions } from "@/models/billings/subscription";
import { UserSnapshotField } from "@/models/users";
import { now } from "@/utils/dates";
import { useAppRouter } from "@/utils/useAppRouter";
import { useToast } from "@/utils/useToast";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { Seconds, formatDate } from "@thegoodcompany/common-utils-js";
import { FieldPath, FieldValue, QueryDocumentSnapshot, QuerySnapshot, Timestamp, deleteField, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { Card, CardBody, CardText, CardTitle, Col, Row } from "react-bootstrap";

const INIT_FETCH_LIMIT = 4;
const SUBS_FETCH_LIMIT = 8;

const SubscriptionCard: React.FunctionComponent<SubscriptionCardProps> = ({
	snapshot,
}) => {
	const router = useAppRouter();
	const { makeToast } = useToast();

	const [renewBtnState, setRenewBtnState] = useState<ButtonProps["state"]>("none");
	const [stateBtnState, setStateBtnState] = useState<ButtonProps["state"]>("none");

	const data = snapshot.data();
	const name = data[SubscriptionField.NAME];
	const _state = data[SubscriptionField.STATE];
	const price = data[SubscriptionField.PRICE];
	
	const [currentState, setCurrentState] = useState(_state);

	const products = data[SubscriptionField.PRODUCTS] || {};

	const billing = data[SubscriptionField.BILLING] || {};
	const cycle = data[SubscriptionField.BILLING]?.[BillingInfoField.CYCLE];
	const nextPayment = data[SubscriptionField.BILLING]?.[BillingInfoField.NEXT_PAYMENT_TIME];
	const nextInvoice = billing[BillingInfoField.NEXT_PAYMENT_INVOICE_ID];

	const isNextPaymentPayable = nextPayment && nextPayment.seconds > (now() / 1000);

	let priceStr: string | undefined;
	if (price) {
		const cents = price[PriceField.AMOUNT_CENTS];
		const currency = price[PriceField.CURRENCY] || "BDT";

		if (cents !== undefined) {
			priceStr = `${cents / 100} ${currency}${cycle ? "/" + new Seconds(cycle).toDays().value + " days" : ""}`;
		}
	}

	const enabledRenewBtn = renewBtnState === "none" && currentState === "active";
	return <Col key={snapshot.id}>
		<Card>
			<CardBody>
				<CardTitle>{name || snapshot.id}</CardTitle>
				<CardText>
					Products: {Object.entries(products).map(([id, metadata]) => {
						return metadata[ProductMetadataField.NAME] || id;
					}).join(", ")}
				</CardText>
				<CardText>
					State: {currentState ? friendlySubscriptionState[currentState] : "N/A"}<br />
					Price: {priceStr || "N/A"}<br />
					Next payment: {currentState === "active" 
						? nextPayment ? formatDate(nextPayment.toDate(), "short", "year", "month", "day") : "N/A"
						: "Not applicable"}
				</CardText>
				<div className="d-flex flex-row">
					{nextInvoice && <Button
						className="me-2"
						variant="outline-primary"
						state={renewBtnState}
						href={enabledRenewBtn ? getAppPaymentUrl(nextInvoice) : "#"}
						disabled={!enabledRenewBtn}
						onClick={(evt) => {
							evt.preventDefault();
							setRenewBtnState("loading");
							router.push(getAppPaymentUrl(nextInvoice));
						}}
					>
						Renew
					</Button>}
					<Button
						variant="outline-secondary"
						disabled={!(stateBtnState === "none" && (
							(currentState === "cancelled" && isNextPaymentPayable) ||
							(currentState === "active")
						))}
						state={stateBtnState}
						onClick={() => {
							setStateBtnState("loading");

							const ref = snapshot.ref;
							
							let newState: SubscriptionState;
							let cancelTime: FieldValue | Timestamp;
							if (currentState === "active") {
								newState = "cancelled";
								cancelTime = serverTimestamp();
							} else {
								newState = "active";
								cancelTime = deleteField();
							}

							setDoc(ref, {
								[SubscriptionField.STATE]: newState,
								[SubscriptionField.CANCEL_TIME]: cancelTime,
							}, { merge: true }).catch(error => {
								console.error("Unable to set subscription:", error);
								makeToast("Unable to update subscription", "error");
							}).finally(async () => {
								setCurrentState(newState);
								setStateBtnState("none");
							});
						}}
					>
						{currentState === "active" ? "Cancel" : "Reactivate"}
					</Button>
				</div>
			</CardBody>
		</Card>
	</Col>;
};

const SubscriptionCardList: React.FunctionComponent<SubscriptionCardListProps> = ({
	snapshot,
}) => {
	return <>
		{snapshot.docs.map(value => <SubscriptionCard key={value.id} snapshot={value} />)}
	</>;
};

export const SubscriptionList: React.FunctionComponent<SubscriptionListProps> = ({
	uid,
	state,
}) => {
	const baseQuery = useMemo(() => {
		return query(getSubscriptions(),
			where(new FieldPath(SubscriptionField.USER, UserSnapshotField.UID), "==", uid),
			where(SubscriptionField.STATE, "==", state),
			orderBy(SubscriptionField.CREATE_TIME, "desc"),
			limit(INIT_FETCH_LIMIT)
		);
	}, [uid, state]);

	const subscriptions = useFirestoreInfiniteQuery(`subscriptions-${uid},${state}`, baseQuery, (snapshot) => {
		if (snapshot.size !== INIT_FETCH_LIMIT && snapshot.size !== SUBS_FETCH_LIMIT) return undefined;

		const endDoc = snapshot.docs[snapshot.size - 1];
		return query(baseQuery, startAfter(endDoc), limit(SUBS_FETCH_LIMIT));
	});

	if (subscriptions.isLoading) return <Loading />;

	if (subscriptions.isError) {
		console.error("Error fetching subscriptions:", subscriptions.error);
		return <QueryErrorView />;
	}

	if (!subscriptions.data?.pages[0].size) {
		return <QueryEmptyView>
			Once you subscribe to one of our feature tiers, they&apos;ll show up here.
		</QueryEmptyView>;
	}

	return <>
		<Row className="g-4" xs={1} xl={2} >
			{subscriptions.data.pages.map((page, i) => <SubscriptionCardList 
				key={`page-${i}`} 
				snapshot={page}
			/>)}
		</Row>
		<ExpandButton
			className="mt-4"
			state={subscriptions.isLoading || subscriptions.isFetching ? "loading" : "none"}
			onClick={() => subscriptions.fetchNextPage()}
			disabled={!subscriptions.hasNextPage || !subscriptions.isSuccess}
		>
			{subscriptions.hasNextPage ? "Load more" : "End"}
		</ExpandButton>
	</>;
};

export interface SubscriptionListProps {
	uid: string,
	state: string,
}

interface SubscriptionCardProps {
	snapshot: QueryDocumentSnapshot<Subscription>,
}

interface SubscriptionCardListProps {
	snapshot: QuerySnapshot<Subscription>,
}
