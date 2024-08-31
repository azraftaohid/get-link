"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageContainer } from "@/components/PageContainer";
import { PageContent } from "@/components/PageContent";
import { useEffect } from "react";
import Alert from "react-bootstrap/Alert";

export default function Err({
	error,
}: Readonly<{
	error: Error & { digest?: string }
	reset: () => void
}>) {
	useEffect(() => {
		// Clarity will collect this error log
		console.error(error);
	}, [error]);

	return <PageContainer>
		<Header />
		<PageContent>
			<Alert variant="danger">
				Looks like we screwed up bad! Sorry, we couldn&apos;t load you this content right now.
			</Alert>
		</PageContent>
		<Footer />
	</PageContainer>;
}
