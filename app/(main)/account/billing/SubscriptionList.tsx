import { Button, ButtonProps } from "@/components/Button";
import { ExpandButton } from "@/components/ExpandButton";
import { Loading } from "@/components/Loading";
import { QueryEmptyView } from "@/components/QueryEmptyView";
import { QueryErrorView } from "@/components/QueryErrorView";
import { BillingInfoField } from "@/models/billings/billingInfo";
import { PriceField } from "@/models/billings/price";
import { ProductMetadataField } from "@/models/billings/product";
import { Subscription, SubscriptionField, friendlySubscriptionState, getSubscriptions } from "@/models/billings/subscription";
import { UserSnapshotField } from "@/models/users";
import { now } from "@/utils/dates";
import { useToast } from "@/utils/useToast";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { Seconds } from "@thegoodcompany/common-utils-js";
import { FieldPath, QueryDocumentSnapshot, QuerySnapshot, deleteField, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { Card, CardBody, CardText, CardTitle, Col, Row } from "react-bootstrap";

const INIT_FETCH_LIMIT = 4;
const SUBS_FETCH_LIMIT = 8;

const SubscriptionCard: React.FunctionComponent<{ snapshot: QueryDocumentSnapshot<Subscription> }> = ({
	snapshot,
}) => {
	const { makeToast } = useToast();
	const [btnState, setBtnState] = useState<ButtonProps["state"]>("none");

	const data = snapshot.data();
	const name = data[SubscriptionField.NAME];
	const cycle = data[SubscriptionField.BILLING]?.[BillingInfoField.CYCLE];
	const nextPayment = data[SubscriptionField.BILLING]?.[BillingInfoField.NEXT_PAYMENT_TIME];
	const state = data[SubscriptionField.STATE];
	const price = data[SubscriptionField.PRICE];
	const products = data[SubscriptionField.PRODUCTS] || {};

	let priceStr: string | undefined;
	if (price) {
		const cents = price[PriceField.AMOUNT_CENTS];
		const currency = price[PriceField.CURRENCY] || "BDT";

		if (cents !== undefined) {
			priceStr = `${cents / 100} ${currency}${cycle ? "/" + new Seconds(cycle).toDays().value + " days" : ""}`;
		}
	}

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
					State: {state ? friendlySubscriptionState[state] : "N/A"}<br />
					Price: {priceStr || "N/A"}
				</CardText>
				<Button
					variant="secondary"
					disabled={!(btnState === "none" && (
						(state === "cancelled" && nextPayment && nextPayment.seconds < (now() / 1000)) ||
						(state === "active")
					))}
					state={btnState}
					onClick={() => {
						setBtnState("loading");

						const ref = snapshot.ref;
						let setPromise: Promise<unknown>;
						if (state === "active") {
							setPromise = setDoc(ref, {
								[SubscriptionField.STATE]: "cancelled",
								[SubscriptionField.CANCEL_TIME]: serverTimestamp(),
							}, { merge: true });
						} else {
							setPromise = setDoc(ref, {
								[SubscriptionField.STATE]: "active",
								[SubscriptionField.CANCEL_TIME]: deleteField(),
							}, { merge: true });
						}

						setPromise.catch(error => {
							console.error("Unable to set subscription:", error);
							makeToast("Unable to update subscription", "error");
						}).finally(() => setBtnState("none"));
					}}
				>
					{state === "active" ? "Cancel" : "Reactivate"}
				</Button>
			</CardBody>
		</Card>
	</Col>;
};

const SubscriptionCardList: React.FunctionComponent<{ snapshot: QuerySnapshot<Subscription> }> = ({
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
			{subscriptions.data.pages.map((page, i) => <SubscriptionCardList key={`page-${i}`} snapshot={page} />)}
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
