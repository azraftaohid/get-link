"use client";

import { RouteIndicatorContext } from "@/components/RouteIndicatorProvider";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { isDifferentPage } from "./urls";

export const useAppRouter = () => {
	const router = useRouter();
	const indicator = useContext(RouteIndicatorContext);

	const push0 = router.push;
	router.push = (href, options) => {
		if (isDifferentPage(href)) indicator.start();
		return push0(href, options);
	};

	return router;
};
