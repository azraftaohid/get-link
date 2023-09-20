import { useEffect, useState } from "react";

export const useAppVisibility = (): VisibilityChangeResult => {
	const [state, setState] = useState<VisibilityState>(typeof document === "undefined" ? "hidden" : document.visibilityState);

	useEffect(() => {
		const stateHandler = () => setState(document.visibilityState);
		document.addEventListener("visibilitychange", stateHandler);

		return () => document.removeEventListener("visibilitychange", stateHandler);
	}, []);

	return state;
};

export type VisibilityState = "hidden" | "visible";
export type VisibilityChangeResult = VisibilityState;
