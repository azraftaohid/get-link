import { NextApiResponse } from "next";
import Alert from "react-bootstrap/Alert";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";

function Error({ statusCode }: { statusCode: number }) {
	return (
		<PageContainer>
			<Metadata
				title={`${statusCode || "Server error"} - Get Link`}
				description="Something happened to our server."
				image="https://getlink.vercel.app/image/cover.png"
			/>
			<Header />
			<PageContent>
				<Alert variant="danger">
					Looks like we screwed up bad! Sorry, we couldn&apos;t load you this content right now.
				</Alert>
			</PageContent>
			<Footer />
		</PageContainer>
	);
}

Error.getInitialProps = ({ res, err }: { res: NextApiResponse; err: NextApiResponse }) => {
	const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
	return { statusCode };
};

export default Error;
