import React from "react";
import Alert from "react-bootstrap/Alert";
import AlertHeading from "react-bootstrap/AlertHeading";

export const QueryEmptyView: React.FunctionComponent<QueryEmptyViewProps> = ({
	title = "Nothings here!",
	children
}) => {
	return (
		<Alert>
			<AlertHeading>{title}</AlertHeading>
			{children}
		</Alert>
	);
};

export type QueryEmptyViewProps = React.PropsWithChildren<{
	title?: string,
}>;
