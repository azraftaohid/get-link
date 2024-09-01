import { User } from "firebase/auth";
import { CollectionReference, Timestamp, collection, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { UserSnapshot, UserSnapshotField } from "../users";
import { BillingInfo, BillingInfoField } from "./billingInfo";
import { Price } from "./price";
import { ComputedProductMetadata, ProductMetadata, ProductMetadataField } from "./product";

export const enum SubscriptionField {
	NAME = "name",
	PRICE = "price",
	PRODUCTS = "products",
	STATE = "state",
	USER = "user",
	CREATE_TIME = "create_time",
	ACTIVE_TIME = "active_time",
	CANCEL_TIME = "cancel_time",
	BILLING = "billing",
}

export const friendlySubscriptionState: Record<SubscriptionState, string> = {
	"active": "Active",
	"cancelled": "Cancelled",
};

export type SubscriptionState = "active" | "cancelled";

export const COLLECTION_SUBSCRIPTION = "subscriptions";

export function getSubscriptions(): CollectionReference<Subscription> {
	return collection(getFirestore(), COLLECTION_SUBSCRIPTION);
}

export function getSubscription(id: string) {
	return doc(getSubscriptions(), id);
}

export async function createSubscription(user: User, options: SubscriptionCreateOptions) {
	const ref = doc(getSubscriptions());
	await setDoc(ref, {
		[SubscriptionField.NAME]: options.name,
		[SubscriptionField.PRODUCTS]: options.products,
		[SubscriptionField.CREATE_TIME]: serverTimestamp(),
		[SubscriptionField.BILLING]: {
			[BillingInfoField.CYCLE]: options.cycle,
		},
		[SubscriptionField.USER]: {
			[UserSnapshotField.UID]: user.uid
		},
	});

	return ref;
}

export interface SubscriptionCreateOptions {
	name: string,
	products: Record<string, Required<Pick<ProductMetadata, ProductMetadataField.NAME>>>,
	cycle: number,
}

export interface Subscription {
	[SubscriptionField.NAME]?: string,
	[SubscriptionField.PRICE]?: Price,
	[SubscriptionField.PRODUCTS]?: Record<string, ProductMetadata>,
	[SubscriptionField.STATE]?: SubscriptionState,
	[SubscriptionField.USER]?: UserSnapshot,
	[SubscriptionField.CREATE_TIME]?: Timestamp,
	[SubscriptionField.ACTIVE_TIME]?: Timestamp,
	[SubscriptionField.CANCEL_TIME]?: Timestamp,
	[SubscriptionField.BILLING]?: BillingInfo,
}

export type ComputedSubscription = Subscription & {
	[SubscriptionField.PRICE]: Required<Price>,
	[SubscriptionField.PRODUCTS]: Record<string, ComputedProductMetadata>,
}

export type SubscriptionSnapshot = {
	[SubscriptionField.PRODUCTS]?: Record<string, ProductMetadata>,
	[SubscriptionField.BILLING]?: BillingInfo,
}
