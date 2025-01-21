import { Addons, AddonsField, getAddons } from "@/models/addons";
import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

const defaultSummery: AddonSummery = { groupKeys: [], data: { } };

export const useAddons = (uid: string | undefined) => {
	const [summery, setSummery] = useState<AddonSummery>(defaultSummery);

	useEffect(() => {
		if (!uid) return setSummery(defaultSummery);

		const docRef = getAddons(uid);
		const unsubscribe = onSnapshot(docRef, (snapshot) => {
			const data = snapshot.data();
			if (!data) return setSummery(defaultSummery);

			const quotaGroups = data[AddonsField.QUOTAS] || { };
			const groupKeys = Object.keys(quotaGroups);

			setSummery({
				groupKeys,
				data
			});
		});

		return unsubscribe;
	}, [uid]);

	return summery;
};

export interface AddonSummery {
	groupKeys: string[],
	data: Addons,
}
