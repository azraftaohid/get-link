import React from "react";
import { mergeNames } from "../../utils/mergeNames";

export const AccountSettings: React.FunctionComponent<AccountSettingsProps> = ({
	className,
	children,
	...rest
}) => {
	return <div className={mergeNames("w-md-75 ps-md-5 mt-4 mt-md-0", className)} {...rest}>
		{children}
	</div>;
};

export type AccountSettingsProps = React.PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>;
