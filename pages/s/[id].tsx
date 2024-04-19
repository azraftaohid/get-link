import { getDoc } from "firebase/firestore";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { ShortlinkField, ShortlinkTargetField, getShortlink } from "../../models/shortlinks";
import { notFound } from "../../utils/common";

const PageView: NextPage = () => {
	return <p>You were supposed to be redirected.</p>;
};

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		fallback: "blocking",
		paths: [],
	};
};

export const getStaticProps: GetStaticProps<Record<string, never>, Segments> = async ({ params }) => {
	console.log("Processing redirect:", params);

	const id = params?.id;
	if (typeof id !== "string") return notFound;

	const ref = getShortlink(id);
	const snapshot = await getDoc(ref);
	const data = snapshot.data();
	const target = data?.[ShortlinkField.TARGET]?.[ShortlinkTargetField.PATH];

	if (typeof target !== "string") return notFound;

	return {
		redirect: {
			destination: target,
			permanent: false,
		}
	};
};

export default PageView;

interface Segments extends ParsedUrlQuery {
	id: string;
}
