import { PageContent } from "@/components/PageContent";
import { WithChildren } from "@/utils/children";

export default function Layout({ children }: WithChildren) {
	return <PageContent size="xl">{children}</PageContent>;
}
