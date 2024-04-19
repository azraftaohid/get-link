import { NextPage } from "next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";

const Plans: NextPage = () => {
	return <PageContainer>
		<Metadata
			title={"Plans - Get Link"}
		/>
		<Header />
		<PageContent>

		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Plans;
