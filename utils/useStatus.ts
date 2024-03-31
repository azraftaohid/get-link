import { useRef, useState } from "react";

/**
 * Component status management hook.
 * Usage:
 * ```TypeScript
 * const { status,  setStatus, ... } = useStatus<T>();
 * ```
 * 
 * @return A React hook to manage component status.
 */
export const useStatus: <T> () => UseStatus<T> = <T> () => {
	const [value, setValue] = useState<T[]>([]);

	const appendStatus = useRef((status: T) => {
		setValue((c) => {
			if (c.includes(status)) return [...c];
			return [...c, status];
		});
	});

	const removeStatus = useRef((status: T) => {
		setValue((c) => {
			const i = c.indexOf(status);
			if (i === -1) return c;

			return [...c.slice(0, i), ...c.slice(i + 1)];
		});
	});

	return {
		status: value,
		setStatus: setValue,
		appendStatus: appendStatus.current,
		removeStatus: removeStatus.current,
	};
};

export interface UseStatus<T> {
	status: T[],
	setStatus: (ts: T[] | ((current: T[]) => T[])) => unknown,
	appendStatus: (t: T) => void,
	removeStatus: (t: T) => void,
}
