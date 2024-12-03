"use client";

import { Conditional } from "@/components/Conditional";
import Link from "@/components/Link";
import { createInvoice } from "@/models/billings/invoice";
import { getCheckoutUrl } from "@/models/billings/payment";
import { ProductMetadataField } from "@/models/billings/product";
import { createSubscription, SubscriptionField } from "@/models/billings/subscription";
import { friendlyTier, Tier } from "@/utils/tiers";
import { useAppRouter } from "@/utils/useAppRouter";
import { useSignInPrompt } from "@/utils/useSignInPrompt";
import { useToast } from "@/utils/useToast";
import { useUser } from "@/utils/useUser";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { StorageSlider } from "./StorageSlider";
import { TierCard, TierCardProps } from "./TierCard";
import { useSubscriptions } from "./useSubscription";

export default function Page() {
	const router = useAppRouter();
	const { isLoading: isAuthLoading, user } = useUser();
	const { makeToast } = useToast();
	const { showSignInPrompt } = useSignInPrompt();
	const { isLoading: isSubscriptionLoading, subscriptions } = useSubscriptions(user?.uid, "active");

	const [[addedCostT2, reservationGbT2], setAddedCostT2] = useState([0, 20]);

	const [status, setStatus] = useState<"none" | "processing" | "failed">("none");

	const t2Pricing = 49 + addedCostT2;

	const onChose: TierCardProps["onChose"] = (id) => {
		if (!user || user.isAnonymous) {
			makeToast("Please create a profile first!", "error");
			showSignInPrompt(true);
			return;
		}
		
		setStatus("processing");

		if (id.startsWith("tier1")) {
			const cancelPromises: Promise<unknown>[] = [];
			for (const subDoc of subscriptions.docs) {
				const data = subDoc.data();
				
				const products = data?.[SubscriptionField.PRODUCTS] || { };
				for (const [id] of Object.entries(products)) {
					if (!id.startsWith("bundle:tier")) continue;

					cancelPromises.push(setDoc(subDoc.ref, {
						[SubscriptionField.STATE]: "cancelled",
						[SubscriptionField.CANCEL_TIME]: serverTimestamp(),
					}, { merge: true }));
					break;
				}
			}

			return Promise.all(cancelPromises);
		}

		let additionalSpaceGb: number | undefined;
		if (id.startsWith("tier2")) additionalSpaceGb = reservationGbT2 - 20;

		const tierName = friendlyTier[id];
		return createSubscription(user, {
			name: tierName,
			products: {
				[`bundle:${id}`]: {
					[ProductMetadataField.NAME]: `${tierName} bundle`,
				},
				...(additionalSpaceGb && {
					[`addon:quota:storage:space:${additionalSpaceGb * Math.pow(2, 30)}`]: {
						[ProductMetadataField.NAME]: `Reserved ${additionalSpaceGb} GB storage`,
					}
				}),
			},
			cycle: 2592000,
		}).then(ref => {
			const sid = ref.id;
			return createInvoice(user, {
				products: {
					[`subscription:${sid}`]: {
						[ProductMetadataField.NAME]: `${tierName} subscription`,
					}
				}
			});
		}).then(ref => {
			const url = getCheckoutUrl(ref.id);
			router.push(url);
		}).catch(error => {
			console.error("Error getting payment URL:", error);
			setStatus("failed");
		});
	};

	const isCurrent = (id: Tier) => subscriptions.currentTiers.includes(id);

	return <>
		<h1>Feature tiers</h1>
		<p className="text-muted">Choose from our feature tiers that best fit your requirements.</p>
		<hr className="mb-4" />
		<Conditional in={status === "failed"}>
			<Alert className="mt-3" variant="danger">
				Sorry, we couldn&apos;t complete your request right now. Please try again after some times. If the issue
				persists, please file a report.
			</Alert>
		</Conditional>
		<fieldset disabled={status !== "none" && status !== "failed"}>
			<Row className="g-4" xs={1} md={2} lg={3}>
				<Col>
					<TierCard
						id="tier1-cedf"
						subtitle="This is the first layer of features offered"
						features={[
							"Unlimited links",
							"Short links",
							"File previews",
							"1 GB of storage"
						]}
						limits={[
							"Up-to five files per link",
							"Max file size is 95 MB",
							"Links are expired after 14 days"
						]}
						pricing="Free of cost"
						onChose={onChose}
						isCurrent={isCurrent("tier1-cedf")}
						disabled={isAuthLoading || isSubscriptionLoading}
					/>
				</Col>
				<Col>
					<TierCard
						id="tier2-fdab"
						subtitle="Experience more without limits"
						features={[
							<>Everything from <i>Tier 1</i></>,
							"Unlimited files per link",
							"Unlimited file size",
							"Arbitrary link expiration time",
							"Adjustable storage capacity",
						]}
						pricing={<>{t2Pricing} BDT/month</>}
						onChose={onChose}
						isCurrent={isCurrent("tier2-fdab")}
						disabled={isAuthLoading || isSubscriptionLoading}
					>
						<StorageSlider className="mt-3" onSettled={setAddedCostT2} />
					</TierCard>
				</Col>
			</Row>
		</fieldset>
		<hr className="mt-4" />
		<Alert variant="info" className="mt-3">
			Supported payment methods: <Link href="https://bkash.com" newTab><Badge bg="secondary">bKash</Badge></Link>
		</Alert>
	</>;
}
