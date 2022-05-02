import { useRouter } from "next/router";
import React from "react";
import { useRouteState } from "../utils/useRouteState";
import { Conditional } from "./Conditional";
import { ShortLoading } from "./ShortLoading";

export const RouteIndicator: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	const router = useRouter();
	const state = useRouteState(router);

	return <Conditional in={state === "loading"}>
		<ShortLoading reset={state !== "loading"} />
	</Conditional>;
};