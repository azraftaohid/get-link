"use client";

import { Loading } from "@/components/Loading";
import { NotSignedIn } from "@/components/accounts/NotSignedIn";
import { useUser } from "@/utils/useUser";
import ProfileUpdateForm from "./ProfileUpdateForm";

export default function Page() {
	const { user, isLoading } = useUser();

	if (isLoading) return <Loading />;
	if (!user) return <NotSignedIn />;

	return <section>
		<h1>Basic profile settings</h1>
		<p>Update your profile for a more personalized experience.</p>
		<hr />
		<ProfileUpdateForm user={user} />
	</section>;
}
