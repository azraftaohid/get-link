import React, { useEffect, useState } from "react";
import ProgressBar, { ProgressBarProps } from "react-bootstrap/ProgressBar";
import { mergeNames } from "../utils/mergeNames";

export const ShortLoading: React.FunctionComponent<React.PropsWithChildren<ShortLoadingProps>> = ({
	className,
	striped = false,
	animated = false,
	variant,
	initPercentage,
	stale,
	...rest
}) => {
	const [percentage, setPercentage] = useState(Math.max(0, initPercentage || 0));

	useEffect(() => {
		if (stale) return;

		const intervalId = setInterval(() => setPercentage(c => {
			// We are using linear animation for 300ms
			// And we target to reach 100% in 2.5s initially. After 60%, we're gradually decreasing the progress rate
			if (c < 60) return c + 12; // multiply by 12 because 100% -> 2500ms; 1% -> 25ms; 300ms / 25ms = 12
			return c + (((100 - c) / 100) * 12);
		}), 300);
		return () => clearInterval(intervalId);
	}, [stale]);

	useEffect(() => {
		if (initPercentage === undefined) return;

		const newPerc = Math.min(100, Math.max(0, initPercentage));
		setPercentage(newPerc);
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
