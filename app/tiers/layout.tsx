import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Tiers",
	description: "Select the feature tier that matches your requirements.",
};

export default function Layout({ children }: WithChildren) {
	return <PageContent size="xl">{children}</PageContent>;
}
