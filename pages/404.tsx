import { NextPage } from "next";
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
			image="https://getlink.vercel.app/image/not_found.png"
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