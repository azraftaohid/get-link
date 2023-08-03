import { QuotaMetric } from "./quotaMetric";

export const defaultQuotas = {
	storage: {
		space: { limit: 1 * 1024 * 1024 * 1024 },
		file_size: { limit: 100 * 1024 * 1024 },
	},
	links: {
		inline_fids: { limit: 5 },
	},
};

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
