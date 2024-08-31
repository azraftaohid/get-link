import Link from "@/components/Link";
import Alert from "react-bootstrap/Alert";
import AlertHeading from "react-bootstrap/AlertHeading";

export function isValidMode(s: unknown): s is Mode {
	return s === "files" || s === "links";
}

export function detnModeFromHash(hash: string, fallback: Mode) {
	const seg = hash.substring(1);
	return isValidMode(seg) ? seg : fallback;
}

export const EmptyView: React.FunctionComponent<React.PropsWithChildren<{ mode: Mode }>> = ({ mode }) => {
	return (
		<Alert>
			<AlertHeading>No {mode} generated yet!</AlertHeading>
			Upload your first file{" "}
			<Link variant="alert" href="/">
				here
			</Link>{" "}
			then comeback.
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

export type Mode = "files" | "links";
