import { QuotaMetric } from "./quotaMetric";

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
