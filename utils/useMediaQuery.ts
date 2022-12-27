import { useEffect, useState } from "react";
import { hasWindow } from "./common";

export const useMediaQuery = (query: string): boolean => {
	const mediaMatch = hasWindow ? window.matchMedia(query) : undefined;
	const [matches, setMatches] = useState(mediaMatch?.matches);

	useEffect(() => {
		const updateMatches = () => setMatches(mediaMatch?.matches);
		mediaMatch?.addEventListener("change", updateMatches);
		updateMatches();

		return () => mediaMatch?.removeEventListener("change", updateMatches);
	}, [mediaMatch]);

	return !!matches;
};
