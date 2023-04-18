import { useEffect, useRef, useState } from "react";
import { TState, rebuildTrackerMapping } from "./tracker.common";

export const useProgressTracker = <T> (initKeys: T[]): UseProgressTracker<T> => {
	const [keys, setKeys] = useState<T[]>(initKeys);
	const [[completedCount, failedCount, cancelledCount], setCounts] = useState([0, 0, 0]);

	const mapping = useRef<Map<T, TState>>(new Map());
	const recompute = useRef((opt?: { t: T, state: TState }) => {
		if (opt) mapping.current.set(opt.t, opt.state);
		
		let newCompletedCount = 0;
		let newFailedCount = 0;
		let newCancelledCount = 0;
		mapping.current.forEach(value => {
			switch (value) {
				case "completed": newCompletedCount++; break;
				case "failed": newFailedCount++; break;
				case "cancelled": newCancelledCount++; break;
			}
		});

		setCounts([newCompletedCount, newFailedCount, newCancelledCount]);
	});

	useEffect(() => {
		mapping.current = rebuildTrackerMapping(keys, mapping.current);
		recompute.current();
	}, [keys]);

	return {
		keys, setKeys,
		removeKey: useRef((t: T) => {
			setKeys((c) => {
				const currentI = c.indexOf(t);
				return currentI === -1 ? c : [...c.slice(0, currentI), ...c.slice(currentI + 1)];
			});
		}).current,
		markCompleted: useRef((t: T) => recompute.current({ t, state: "completed" })).current,
		markFailed: useRef((t: T) => recompute.current({ t, state: "failed" })).current,
		markCancelled: useRef((t: T) => recompute.current({ t, state: "cancelled" })).current,
		completedCount,
		failedCount,
		cancelledCount,
	};
};

export interface UseProgressTracker<T> {
	keys: T[],
	setKeys: (ts: T[]) => void,
	removeKey: (t: T) => void,
	markCompleted: (t: T) => void,
	markCancelled: (t: T) => void,
	markFailed: (t: T) => void,
	completedCount: number,
	cancelledCount: number,
	failedCount: number,
}
