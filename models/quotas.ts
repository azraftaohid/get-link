import { QuotaMetric } from "./quotaMetric";

/**
 * About limits
 * 	- 0: no quota is available
 * 	- -1: quota is unlimited
 * 	- Other integers: exact amount of available
 */

export const QUOTA_COLLECTION_ID = "quotas";

export const defaultQuotas = {
	storage: {
		space: { limit: 1 * 1024 * 1024 * 1024 },
		file_size: { limit: 100 * 1024 * 1024 },
	},
	links: {
		inline_fids: { limit: 5 },
	},
};

export function interpretlimit(limit: number | undefined, formatter?: (n: number) => string) {
	if (!limit) return "None";
	if (limit === -1) return "No limits";
	return formatter ? formatter(limit) : limit;
}

export interface Quotas {
	storage?: {
		space?: QuotaMetric,
		file_size?: QuotaMetric,
		documents?: {
			write?: QuotaMetric,
		}
	},
	analytics?: {
		views?: { count?: QuotaMetric },
		downloads?: { count?: QuotaMetric },
	},
	links?: {
		inline_fids: QuotaMetric,
	}
}
