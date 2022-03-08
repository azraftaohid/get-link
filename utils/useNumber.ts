import { useMemo, useState } from "react";

export const useNumber = (initValue: number): [number, UseNumberOptions] => {
	const [number, setNumber] = useState(initValue);

	const options = useMemo<UseNumberOptions>(() => ({
		increase: () => setNumber(v => v + 1),
		decrease: () => setNumber(v => v - 1),
		to: setNumber,
	}), []);

	return [number, options];
};

export interface UseNumberOptions {
	increase: () => void,
	decrease: () => void,
	to: (newValue: number | ((current: number) => number)) => void,
}