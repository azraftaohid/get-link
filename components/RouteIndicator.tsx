import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { useRouteState } from "../utils/useRouteState";
import { Conditional } from "./Conditional";

function calcNext(from: number, iteration: number /* a non zero positive integer */) {
	return from + ((100 - from) / (3 * iteration));
}

export const RouteIndicator: React.FunctionComponent = () => {
	const router = useRouter();
	const state = useRouteState(router);
	
	const iteration = useRef(0);
	const [percentage, setPercentage] = useState(0);

	useEffect(() => {
		if (state === "none") return;
		
		const setter = () => {
			const i = iteration.current++;
			setPercentage(i === 0 ? 60 : (current) => {
				const proposed = calcNext(current, i);
				return proposed - current < .1 ? current : proposed;
			});
		};

		const delay = 3000 * (iteration.current / (10 + (6 * (iteration.current - 1))));
		console.debug(`stall delay: ${delay}`);
		const id = setTimeout(setter, delay);
		return () => clearTimeout(id);
	});

	return <Conditional in={state === "loading"}>
		<div className="stall">
			<ProgressBar className="rounded-0" striped now={percentage} />
		</div>
	</Conditional>;
};