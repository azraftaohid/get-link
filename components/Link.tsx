import NextLink from "next/link";
import React from "react";
import { mergeNames } from "../utils/mergeNames";

const variantMapping: Partial<Record<LinkVariant, string>> = {
	reset: "text-reset",
	alert: "alert-link",
};

export const Link: React.FunctionComponent<React.PropsWithChildren<LinkProps>> = ({
	className,
	href,
	newTab,
	variant,
	children,
	...rest
}) => {
	return <NextLink
		href={href}
        className={mergeNames(variant && (variantMapping[variant] || `link-${variant}`), className)}
        target={newTab ? "_blank" : undefined}
        {...rest}
	>
		{children}
    </NextLink>;
};

export default Link;

export type LinkVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "reset" | "alert";

export type LinkProps = Parameters<typeof NextLink>[0] & {
	className?: string,
	href: string;
	newTab?: boolean;
	target?: never;
	variant?: LinkVariant;
}
