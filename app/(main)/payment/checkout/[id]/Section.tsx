import React, { PropsWithChildren } from "react";

export const Section: React.FunctionComponent<SectionProps> = ({
	title,
	children,
	...rest
}) => {
	return <div {...rest}>
		{title && <p className="lead">{title}:</p>}
		{children}
	</div>;
};

export type SectionProps = PropsWithChildren<{
	title?: string,
}> & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
