export const rebuildTrackerMapping = <T> (ts: T[], current: TrackerMapping<T>): TrackerMapping<T> => {
	const newMapping = new Map();
	ts.forEach(t => {
		const currentValue = current.get(t);
		newMapping.set(t, currentValue || "none");
	});

	return newMapping;
};

export type TState = "none" | "completed" | "paused" | "cancelled" | "failed";
export type TrackerMapping<T> = Map<T, TState>;
