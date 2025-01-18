"use client";

import { Loading } from "@/components/Loading";
import { NotSignedIn } from "@/components/accounts/NotSignedIn";
import { SubscriptionState, friendlySubscriptionState } from "@/models/billings/subscription";
import { useUser } from "@/utils/useUser";
import { useState } from "react";
import DropdownButton from "react-bootstrap/DropdownButton";
import DropdownHeader from "react-bootstrap/DropdownHeader";
import DropdownItem from "react-bootstrap/DropdownItem";
import { PaymentList } from "./PaymentList";
import { SubscriptionList } from "./SubscriptionList";

export default function Page() {
	const { user, isLoading } = useUser();
	
	const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionState>("active");

	if (isLoading) return <Loading />;
	if (!user) return <NotSignedIn />;

	return <>
		<h1>Billing</h1>
		<p>Manage your subscriptions, payments, and invoices here.</p>
		<hr />
		<section className="mb-3">
			<div className="clearfix">
				<h2 className="float-start">Subscriptions</h2>
				<DropdownButton 
					id="subscription-filter-options" 
					className="float-end"
					title={friendlySubscriptionState[subscriptionFilter]}
					variant="outline-vivid"
					align="end"
					onSelect={key => key && setSubscriptionFilter(key as SubscriptionState)}
				>
					<DropdownHeader>Choose state</DropdownHeader>
					{Object.entries(friendlySubscriptionState).map(([key, value]) => <DropdownItem
						key={key} 
						eventKey={key}
					>
						{value}
					</DropdownItem>)}
				</DropdownButton>
			</div>
			<p>View and manage your active and past subscriptions.</p>
			<SubscriptionList uid={user.uid} state={subscriptionFilter} />
		</section>
		<hr />
		<section>
			<h2>Payment history</h2>
			<p>Review your payment history.</p>
			<PaymentList uid={user.uid} />
		</section>
	</>;
}
