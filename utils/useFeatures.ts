import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { QuotaMetric } from "../models/quotaMetric";
import { Quotas, defaultQuotas, getQuotas } from "../models/quotas";
import { Flattened, accessProperty } from "./objects";

export const useFeatures = (): UseFeatures => {
	const { data: user } = useAuthUser(["usr"], getAuth());

	const [isDefault, setDefault] = useState(true);
	const [quotas, setQuotas] = useState<Quotas>(defaultQuotas);

	const uid = user?.uid;
	useEffect(() => {
		if (!uid) return setQuotas(defaultQuotas);

		const quotaRef = getQuotas(uid);
		onSnapshot(quotaRef, snapshot => {
			const data = snapshot.data();
			setQuotas(data || defaultQuotas);
			setDefault(!data);
		}, err => {
			console.error(`error getting user quota information [uid: ${uid}; cause: ${err}]`);
			console.info("proceeding with default quota");

			setQuotas(defaultQuotas);
		});
	}, [uid]);

	return {
		isDefault: isDefault,
		quotas: quotas,
		isAvailable: (quota: keyof Flattened<Quotas>) => {
			const metric: QuotaMetric = accessProperty(quotas, quota);
			return !!metric && (metric.limit ?? 0) > (metric.current_usage || 0);
		},
	};
};

export interface UseFeatures {
	isDefault: boolean,
	isAvailable: (quota: keyof Flattened<Quotas>) => boolean,
	quotas: Quotas,
}
