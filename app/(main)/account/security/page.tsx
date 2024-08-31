"use client";

import { Loading } from "@/components/Loading";
import { NotSignedIn } from "@/components/accounts/NotSignedIn";
import { useUser } from "@/utils/useUser";
import SecurityUpdateForm from "./SecurityUpdateForm";

export default function Page() {
	const { user, isLoading } = useUser();

	if (isLoading) return <Loading />;
	if (!user) return <NotSignedIn />;
	
	return <section>
		<h1>Security settings</h1>
		<p>Update your security information.</p>
		<hr />
		<SecurityUpdateForm user={user} />
	</section>;
}
