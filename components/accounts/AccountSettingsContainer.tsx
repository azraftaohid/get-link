import React from "react";
import { mergeNames } from "../../utils/mergeNames";

export const AccountSettingsContainer: React.FunctionComponent<AccountSettingsContainerProps> = ({
	className,
	children,
	...rest
}) => {
	return <div className={mergeNames("d-flex flex-column flex-md-row", className)} {...rest}>
		{children}
	</div>;
};

export interface AccountSettingsContainerProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {

}
