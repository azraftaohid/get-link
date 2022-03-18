import { NextPage } from "next";
import React from "react";
import Alert from "react-bootstrap/Alert";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";

const NotFound: NextPage = () => {
	return <PageContainer>
		<Metadata 
			title="Not found - Get Link"
			description="Darn! We couldn't find the page you are looking for."
			image="https://firebasestorage.googleapis.com/v0/b/project-hubble.appspot.com/o/system%2Fnot_found.png?alt=media&token=91bb6bf6-a70a-4d0e-89cd-c4dbe8c13c12"
		/>
		<Header />
		<PageContent>
			<Alert variant="warning">
				Looks like the page you are looking for doesn&apos;t exist. Please check URL for mistakes and try again.
			</Alert>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default NotFound;