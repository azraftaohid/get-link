import { useEffect, useRef, useState } from "react";
import { TState, rebuildTrackerMapping } from "./tracker.common";

export const useParallelTracker = <T> (ts: T[], maxParallel = 3) => {
	const mapping = useRef<Map<T, TState>>(new Map());
	const recompute = useRef((opt?: { t: T, state: TState }) => {
		if (opt) mapping.current.set(opt.t, opt.state);

		const newRunnings: T[] = [];
		for (let keys = mapping.current.keys(), nextT: T; (nextT = keys.next().value); ) {
			const nextState = mapping.current.get(nextT);

			if (nextState === "none") newRunnings.push(nextT);
			if (newRunnings.length >= maxParallel) break;
		}

		setRunnings(newRunnings);
	});

	const [runnings, setRunnings] = useState<T[]>(ts.slice(0, maxParallel));

	useEffect(() => {
		mapping.current = rebuildTrackerMapping(ts, mapping.current);
		recompute.current();
	}, [ts]);

	return {
		runnings,
		markCompleted: useRef((t: T) => recompute.current({ t, state: "completed" })).current,
		markPaused: useRef((t: T) => recompute.current({ t, state: "paused" })).current,
	};
};
