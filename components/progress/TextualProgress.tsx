import React from "react";
import { mergeNames } from "../../utils/mergeNames";

export const TextualProgress: React.FunctionComponent<TextualProgressProps> = ({
	className,
	variant = "muted",
	children,
	...rest
}) => {
	return <small className={mergeNames(`text-${variant}`, className)} {...rest}>
		{children}
	</small>;
};

export interface TextualProgressProps extends React.PropsWithChildren<React.HTMLAttributes<HTMLElement>> {
	variant?: "muted" | "danger" | "warning",
}
