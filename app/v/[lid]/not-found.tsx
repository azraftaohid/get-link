import { Metadata } from "next";
import Alert from "react-bootstrap/Alert";

export const metadata: Metadata = {
	title: "Link not found",
	description: "The requested link doesn't exist or has expired.",
};

export default function Page() {
	return <Alert variant="warning">
		Looks like the content you are looking for doesn&apos;t exist or has expired. Please check URL for mistakes and try
		again.
	</Alert>;
}
