import { useRouter } from "next/router";
import React from "react";
import { useRouteState } from "../utils/useRouteState";
import { Conditional } from "./Conditional";
import { ShortLoading } from "./ShortLoading";

/**
 * @deprecated Use {@link RouteIndicatorProvider} instead.
 */
export const RouteIndicator: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	const router = useRouter();
	const state = useRouteState(router);

	return (
		<Conditional in={state === "loading"}>
			<ShortLoading stale={state !== "loading"} />
		</Conditional>
	);
};
