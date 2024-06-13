"use client";

import { isDifferentPage } from "@/utils/urls";
import NextLink from "next/link";
import React, { useContext } from "react";
import { mergeNames } from "../utils/mergeNames";
import { RouteIndicatorContext } from "./RouteIndicatorProvider";

const variantMapping: Partial<Record<LinkVariant, string>> = {
	reset: "text-reset",
	alert: "alert-link",
	nav: "nav-link",
};

export const Link: React.FunctionComponent<React.PropsWithChildren<LinkProps>> = ({
	className,
	href,
	newTab,
	variant,
	onClick,
	children,
	...rest
}) => {
	const routeIndicator = useContext(RouteIndicatorContext);

	return <NextLink
		href={href}
		className={mergeNames(variant && (variantMapping[variant] || `link-${variant}`), className)}
		target={newTab ? "_blank" : undefined}
		onClick={(evt) => {
			const sameTab = !newTab && rest.target !== "_blank" && !evt.ctrlKey && !evt.altKey && !evt.shiftKey && !evt.metaKey; 
			if (sameTab && isDifferentPage(href)) routeIndicator.start();

			onClick?.(evt);
		}}
		{...rest}
	>
		{children}
	</NextLink>;
};

export default Link;

export type LinkVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "reset" | "alert" | "nav";

export type LinkProps = Parameters<typeof NextLink>[0] & {
	className?: string,
	href: string;
	newTab?: boolean;
	target?: never;
	variant?: LinkVariant;
}
