import { CollectionReference, collection, doc, getFirestore } from "firebase/firestore";
import { QuotaMetric } from "./quotaMetric";

/**
 * About limits
 *  - 0: implicitly unavailable
 * 	- other integers: total amount that is usable
 */

export const QUOTA_COLLECTION_ID = "quotas";

export const defaultQuotas = {
	storage: {
		space: { limit: 1 * 1024 * 1024 * 1024 },
		filesize: { limit: 100 * 1024 * 1024 },
	},
	links: {
		inlinefids: { limit: 5 },
	},
};

export function getQuotaCollection(): CollectionReference<Quotas> {
	return collection(getFirestore(), QUOTA_COLLECTION_ID);
}

export function getQuotas(uid: string) {
	return doc(getQuotaCollection(), uid);
}

export function interpretlimit(limit: number | undefined, formatter?: (n: number) => string) {
	if (!limit) return "None";
	return formatter ? formatter(limit) : limit;
}

export interface Quotas {
	storage?: {
		space?: QuotaMetric,
		filesize?: QuotaMetric,
	},
	analytics?: {
		views?: { count?: QuotaMetric },
		downloads?: { count?: QuotaMetric },
	},
	filedocs?: {
		write?: QuotaMetric,
	},
	links?: {
		inlinefids?: QuotaMetric,
	}
}
