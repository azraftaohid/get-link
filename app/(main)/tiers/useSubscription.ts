import { ProductMetadataField } from "@/models/billings/product";
import { Subscription, SubscriptionField, SubscriptionState, getSubscriptions } from "@/models/billings/subscription";
import { UserSnapshotField } from "@/models/users";
import { Tier } from "@/utils/tiers";
import { FieldPath, QueryDocumentSnapshot, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

const defaultSummery: SubscriptionSummery = {
	currentTiers: ["tier1-000"],
	ids: [],
	names: [],
	productNames: [],
	productIds: [],
	docs: []
};

export const useSubscriptions = (uid: string | undefined, state?: SubscriptionState) => {
	const [isLoading, setLoading] = useState(true);
	const [subscriptions, setSubscriptions] = useState<SubscriptionSummery>(defaultSummery);
	
	useEffect(() => {
		if (!uid) {
			setSubscriptions(defaultSummery);
			setLoading(false);
			return;
		}

		let q = query(getSubscriptions(), 
			where(new FieldPath(SubscriptionField.USER, UserSnapshotField.UID), "==", uid),
			limit(12)
		);
		if (state) q = query(q, where(SubscriptionField.STATE, "==", "active"));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const currentTiers: Tier[] = [];
			const ids: string[] = [];
			const names: string[] = [];
			const productNames: string[] = [];
			const productIds: string[] = [];

			snapshot.forEach(value => {
				ids.push(value.id);

				const data = value.data();
				const name = data[SubscriptionField.NAME];
				const products = data[SubscriptionField.PRODUCTS] || { };

				names.push(name || value.id);
				for (const [id, metadata] of Object.entries(products)) {
					if (id.startsWith("bundle:tier")) {
						currentTiers.push(id.split("bundle:")[1] as Tier);
					}

					productIds.push(id);
					productNames.push(metadata[ProductMetadataField.NAME] || id);
				}
			});
			
			setSubscriptions({
				currentTiers: currentTiers.length ? currentTiers : defaultSummery.currentTiers,
				ids,
				names,
				productIds,
				productNames,
				docs: snapshot.docs,
			});
			setLoading(false);
		}, error => {
			console.error("Unable to listen to user subscriptions query:", error);
			setLoading(false);
		});

		return () => {
			setLoading(true);
			unsubscribe();
		};
	}, [state, uid]);

	return { isLoading, subscriptions };
};

export interface SubscriptionSummery {
	currentTiers: Tier[],
	ids: string[],
	names: string[],
	productNames: string[],
	productIds: string[],
	docs: QueryDocumentSnapshot<Subscription>[],
}
