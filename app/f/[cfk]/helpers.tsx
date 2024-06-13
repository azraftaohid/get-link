import Alert from "react-bootstrap/Alert";
import AlertHeading from "react-bootstrap/AlertHeading";

export const EmptyBacklinks: React.FunctionComponent = () => {
	return (
		<Alert>
			<AlertHeading>No backlinks found!</AlertHeading>
			This can happen when the file is uploaded but link creation is not completed yet or
			the link creation process was dismissed abruptly.
		</Alert>
	);
};

export const BacklinksError: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert variant="danger">
			<Alert.Heading>Something went wrong!</Alert.Heading>
			We couldn&apos;t display you the data you&apos;re looking for. Please try again later, or if this
			issue persist, file a report.
		</Alert>
	);
};
