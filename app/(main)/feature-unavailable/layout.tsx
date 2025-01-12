import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Feature Unavailable",
	description: "Looks like this feature is not available for you yet.",
};

export default function Layout({ children }: WithChildren) {
	return <PageContent size="xl">{children}</PageContent>;
}
