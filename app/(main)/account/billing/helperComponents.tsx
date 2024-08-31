import React from "react";
import Alert from "react-bootstrap/Alert";
import AlertHeading from "react-bootstrap/AlertHeading";

export const EmptyView: React.FunctionComponent<React.PropsWithChildren> = ({ children }) => {
	return (
		<Alert>
			<AlertHeading>Nothings here!</AlertHeading>
			{children}
		</Alert>
	);
};

export const ErrorView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert variant="danger">
			<AlertHeading>Something went wrong!</AlertHeading>
			We couldn&apos;t fetch display you the data you&apos;re looking for. Please try again later, or if this
			issue persist, file a report.
		</Alert>
	);
};
