import { User } from "firebase/auth";
import { useRef } from "react";
import { QuotaMetric } from "../models/quotaMetric";
import { Quotas, defaultQuotas } from "../models/quotas";
import { Flattened, accessProperty } from "./objects";

export const useFeatures = (user: User | null | undefined): UseFeatures => {
	if (user && !user.isAnonymous) {
		console.warn("user is not anonymous; useFeatures is not implemented yet, proceeding with default data.");
	}

	const quotas = useRef<Quotas>(defaultQuotas);

	return {
		isDefault: true,
		quotas: quotas.current,
		isAvailable: useRef((quota: keyof Flattened<Quotas>) => {
			const metric: QuotaMetric = accessProperty(quotas.current, quota);
			return !!metric && (metric.limit ?? 0) > (metric.current_usage || 0);
		}).current,
	};
};

export interface UseFeatures {
	isDefault: boolean,
	isAvailable: (quota: keyof Flattened<Quotas>) => boolean,
	quotas: Quotas,
}
