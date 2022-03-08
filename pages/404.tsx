import { NextPage } from "next";
import Head from "next/head";
import React from "react";
import Alert from "react-bootstrap/Alert";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";

const NotFound: NextPage = () => {
	return <PageContainer>
		<Head>
			<title>Not found - Get Link</title>
			<meta name="description" content="Darn! We couldn't find the page you are looking for."/>
		</Head>
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