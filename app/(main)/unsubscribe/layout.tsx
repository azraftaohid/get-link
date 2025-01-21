import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Unsubscribe",
	description: "Unsubscribe to services offered by Get Link",
	robots: {
		index: false,
	},
};

export default function Layout({ children }: WithChildren) {
	return <PageContent>{children}</PageContent>;
}
