import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Download file",
	robots: {
		index: false,
	}
};

export default function Layout({ children }: WithChildren) {
	return <PageContent>{children}</PageContent>;
}
