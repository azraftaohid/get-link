import React, { useEffect, useRef, useState } from "react";
import ProgressBar, { ProgressBarProps } from "react-bootstrap/ProgressBar";
import { mergeNames } from "../utils/mergeNames";

function calcNext(from: number, iteration: number /* a non zero positive integer */) {
	return from + ((100 - from) / (3 * iteration));
}

export const ShortLoading: React.FunctionComponent<React.PropsWithChildren<ShortLoadingProps>> = ({ 
	className, 
	striped = true, 
	animated, 
	variant, 
	reset, 
	...rest 
}) => {
	const iteration = useRef(0);
	const [percentage, setPercentage] = useState(0);

	useEffect(() => {
		if (reset) return;
		
		const setter = () => {
			const i = iteration.current++;
			setPercentage(i === 0 ? 60 : (current) => {
				const proposed = calcNext(current, i);
				return proposed - current < .1 ? current : proposed;
			});
		};

		const delay = 3000 * (iteration.current / (10 + (6 * (iteration.current - 1))));
		const id = setTimeout(setter, delay);
		return () => clearTimeout(id);
	});

	return <div className={mergeNames("stall", className)} {...rest}>
		<ProgressBar className="rounded-0" now={percentage} {...{ striped, variant, animated }} />
	</div>;
};

export interface ShortLoadingProps 
	extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, 
	Pick<ProgressBarProps, "striped" | "animated" | "variant"> {
		
		reset?: boolean
}