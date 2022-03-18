import NextLink from "next/link";
import React from "react";
import { mergeNames } from "../utils/mergeNames";

export const Link: React.FunctionComponent<LinkProps> = ({ className, href, newTab, variant, children, ...rest }) => {
	return <NextLink href={href}>
		<a className={mergeNames(variant && ((variant === "reset" && "text-reset") || `link-${variant}`), className)} 
			target={newTab ? "_blank" : undefined} 
			{...rest}
		>
			{children}
		</a>
	</NextLink>;
};

export interface LinkProps extends React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
	href: string,
	newTab?: boolean,
	target?: never,
	variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "reset",
}