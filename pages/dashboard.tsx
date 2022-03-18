import { NextPage } from "next";
import Alert from "react-bootstrap/Alert";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";

const Dashboard: NextPage = () => {
	return <PageContainer>
		<Metadata 
			title="Dashboard - Get Link" 
			description="See your upload history and more."
			image="https://firebasestorage.googleapis.com/v0/b/project-hubble.appspot.com/o/system%2Fcover.png?alt=media&token=69155660-7770-4749-8525-df707b46f4c8" 
		/>
		<Header />
		<PageContent>
			<Alert variant="info">
				<Alert.Heading>Please come back later!</Alert.Heading>
				This page is in development right now. Thanks for checking in.
			</Alert>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Dashboard;