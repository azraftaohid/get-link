import React from "react";
import { mergeNames } from "../utils/mergeNames";

const sizes: Partial<Record<NonNullable<IconProps["size"]>, string>> = {
	sm: "fs-5",
	lg: "fs-1",
};

export const Icon: React.FunctionComponent<React.PropsWithChildren<IconProps>> = ({ name, className, size = "md", ...rest }) => {
	return <div className={mergeNames("d-inline-flex align-items-center", className)} {...rest}>
		<span className={mergeNames("material-icons-outlined", sizes[size])}>{name}</span>
	</div>;
};

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
	name: string,
	size?: "sm" | "md" | "lg",
}