import { getAuth, signOut } from "firebase/auth";
import { NextPage } from "next";
import Alert from "react-bootstrap/Alert";
import { useUser } from "reactfire";
import { ExpandButton } from "../components/ExpandButton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { useToast } from "../utils/useToast";

const Profile: NextPage = () => {
	const { makeToast } = useToast();
	const { data: user } = useUser();

	return <PageContainer>
		<Header />
		<PageContent>
			{user ? <ExpandButton
				onClick={async () => {
					try {
						await signOut(getAuth());
						makeToast("Signed out", "info");
					} catch (error) {
						console.error(`error signing out [cause: ${error}]`);
						makeToast("Unable to sign out", "error");
					}
				}}
			>
				Sign out
			</ExpandButton> : <Alert variant="info">
				User not signed-in yet. Please sign-in using the button from header.
			</Alert>}
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Profile;
