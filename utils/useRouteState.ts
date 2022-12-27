import { NextRouter } from "next/router";
import { useEffect, useState } from "react";

export const useRouteState = (router: NextRouter) => {
	const [state, setState] = useState<"loading" | "none">("none");

	useEffect(() => {
		const handleStart = (url: string) => url !== router.asPath && setState("loading");
		const handleEnd = (url: string) => url === router.asPath && setState("none");

		router.events.on("routeChangeStart", handleStart);
		router.events.on("routeChangeComplete", handleEnd);
		router.events.on("routeChangeError", handleEnd);

		return () => {
			router.events.off("routeChangeStart", handleStart);
			router.events.off("routeChangeComplete", handleEnd);
			router.events.off("routeChangeError", handleEnd);
		};
	}, [router.asPath, router.events]);

	return state;
};
