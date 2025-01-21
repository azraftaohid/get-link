import Alert from "react-bootstrap/Alert";
import AlertHeading from "react-bootstrap/AlertHeading";

export default function Page() {
	return <Alert variant="info">
		<AlertHeading>Feature not available!</AlertHeading>
		Looks like you found a feature that is not available for you yet. Please check back later.
	</Alert>;
}
