import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard",
	description: "See your upload history and more.",
};

export default function Layout({ children }: WithChildren) {
	return <PageContent>{children}</PageContent>;
}
