import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { QuotaMetric } from "../models/quotaMetric";
import { Quotas } from "../models/quotas";

export const useFeatures = (): UseFeatures => {
	const { data: user } = useAuthUser(["auth"], getAuth());
	if (user && !user.isAnonymous) {
		console.warn("user is not anonymous; useFeatures is not implemented yet, proceeding with default data.");
	}

	return {
		isDefault: true,
		quotas: {
			storage: {
				space: { limit: 1 * 1024 * 1024 * 1024 },
				file_size: { limit: 100 * 1024 * 1024 },
			},
			links: {
				inline_fids: { limit: 5 },
			},
		},
		isAvailable: ({ limit, current_usage }) => {
			return (limit ?? 0) > (current_usage || 0);
		},
	};
};

export interface UseFeatures {
	isDefault: boolean,
	isAvailable: (metric: QuotaMetric) => boolean,
	quotas: Quotas,
}
