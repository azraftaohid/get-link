import React, { useEffect, useState } from "react";
import ProgressBar, { ProgressBarProps } from "react-bootstrap/ProgressBar";
import { mergeNames } from "../utils/mergeNames";

function calcNext(from: number, iteration: number /* a non zero positive integer */) {
	return from + (100 - from) / (3 * iteration);
}

export const ShortLoading: React.FunctionComponent<React.PropsWithChildren<ShortLoadingProps>> = ({
	className,
	striped = true,
	animated,
	variant,
	initPercentage = 0,
	stale,
	...rest
}) => {
	const [iteration, setIteration] = useState(0);
	const [percentage, setPercentage] = useState(Math.max(0, initPercentage));

	useEffect(() => {
		if (stale) return;

		const setter = () => {
			const i = iteration;
			setIteration(c => ++c);
			setPercentage(
				i === 0
					? 30
					: (current) => {
							const proposed = calcNext(current, i);
							return proposed - current < 0.1 ? current : proposed;
					  }
			);
		};

		const delay = 3000 * (iteration / (10 + 6 * (iteration - 1)));
		const id = setTimeout(setter, delay);
		return () => clearTimeout(id);
	}, [iteration, stale]);

	useEffect(() => {
		const newPerc = Math.min(100, Math.max(0, initPercentage));
		setPercentage(newPerc);
		if (newPerc === 0) setIteration(0);
	}, [initPercentage]);

	return (
		<div className={mergeNames("stall", className)} {...rest}>
			<ProgressBar className="rounded-0" now={percentage} {...{ striped, variant, animated }} />
		</div>
	);
};

export interface ShortLoadingProps
	extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
		Pick<ProgressBarProps, "striped" | "animated" | "variant"> {
	initPercentage?: number, // Starting progress percentage. Value below 0 and above 100 will be counted as 0 and 100 respectively
	stale?: boolean, // Stop increasing progress
}
