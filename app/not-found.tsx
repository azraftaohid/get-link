import { PageContent } from "@/components/PageContent";
import { Metadata } from "next";
import Alert from "react-bootstrap/Alert";

export const metadata: Metadata = {
	title: "Not found",
	description: "Darn! We couldn't find the page you are looking for.",
	openGraph: {
		images: "/image/not_found.png",
	},
	twitter: {
		images: "/image/not_found.png",
	}
};

export default function NotFound() {
	return <PageContent>
		<Alert variant="warning">
			Looks like the page you are looking for doesn&apos;t exist. Please check URL for mistakes and try
			again.
		</Alert>
	</PageContent>;
}
