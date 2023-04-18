import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { useRef } from "react";
import { QuotaMetric } from "../models/quotaMetric";
import { Quotas } from "../models/quotas";
import { Flattened, accessProperty } from "./objects";

export const useFeatures = (): UseFeatures => {
	const { data: user } = useAuthUser(["auth"], getAuth());
	if (user && !user.isAnonymous) {
		console.warn("user is not anonymous; useFeatures is not implemented yet, proceeding with default data.");
	}

	const quotas = useRef<Quotas>({
		storage: {
			space: { limit: 1 * 1024 * 1024 * 1024 },
			file_size: { limit: 100 * 1024 * 1024 },
		},
		links: {
			inline_fids: { limit: 5 },
		},
	});

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
