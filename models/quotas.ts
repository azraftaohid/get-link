import { CollectionReference, collection, doc, getFirestore } from "firebase/firestore";
import { QuotaMetric } from "./quotaMetric";

/**
 * # Quotas
 * Quotas define the limits on user access to specific services or features..
 * Each quota formation includes a) parent scope, b) quota, c) definition. E.g., storage.space is a quota
 * and its definition includes the limit and current usage of this quota.
 * 
 * ## Interpretation
 * A service or feature is accessible to a user if the current usage (zero if undefined) of the corresponding 
 * quota is below or equal to its limit and it is ensurable that upon using the service the quota would not be 
 * crossed (hence, current usage would not be higher than limit).
 * 
 * A service or feature is accessible to a user if the current usage of the corresponding quota is below its limit.
 * 
 * ## Limit implications
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

export function mergeQuotas(q1: Quotas, q2: Quotas) {
	const newQuotas: Quotas = { ...q1, ...q2 };

	const scopes = Object.keys(newQuotas) as (keyof Quotas)[];
	scopes.forEach(scope => {
		const newScope = newQuotas[scope] = { ...q1[scope], ...q2[scope] } as Record<string, QuotaMetric>;
		
		const quotaNames = Object.keys(newScope);
		quotaNames.forEach((quota) => newScope[quota] = {
			...(q1?.[scope] as Record<string, QuotaMetric> | undefined)?.[quota],
			...(q2?.[scope] as Record<string, QuotaMetric> | undefined)?.[quota]
		});
	});

	return newQuotas;
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
		viewcount?: QuotaMetric,
		downloadcount?: QuotaMetric,
	},
	filedocs?: {
		write?: QuotaMetric,
	},
	links?: {
		inlinefids?: QuotaMetric,
	}
}
