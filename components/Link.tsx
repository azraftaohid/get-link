import NextLink from "next/link";
import React from "react";

export const Link: React.FunctionComponent<LinkProps> = ({ href, newTab, children, ...rest }) => {
	return <NextLink href={href}>
		<a target={newTab ? "_blank" : undefined} {...rest}>
			{children}
		</a>
	</NextLink>;
};

export interface LinkProps extends React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
	href: string,
	newTab?: boolean,
	target?: never
}