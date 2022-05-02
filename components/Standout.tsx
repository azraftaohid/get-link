import React from "react";
import { mergeNames } from "../utils/mergeNames";

export const Standout: React.FunctionComponent<React.PropsWithChildren<StandoutProps>> = ({ className, singleLine, children, ...rest }) => {
	return <div className={mergeNames("standout", singleLine && "overflow-scroll text-nowrap", className)} {...rest}>
		{children}
	</div>;
};

export interface StandoutProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	singleLine?: boolean,
}