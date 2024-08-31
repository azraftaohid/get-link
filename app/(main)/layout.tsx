import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageContainer } from "@/components/PageContainer";

export default function Layout({ children }: Readonly<React.PropsWithChildren>) {
	return <PageContainer>
		<Header />
		{children}
		<Footer />
	</PageContainer>;
}
