import { ShortlinkField, ShortlinkTargetField, getShortlink } from "@/models/shortlinks";
import { initFirebase } from "@/utils/firebase";
import { getDoc } from "firebase/firestore";
import { unstable_cache } from "next/cache";
import { RedirectType, notFound, redirect } from "next/navigation";

export const dynamic = "force-static";
export const dynamicParams = true;

const getData = unstable_cache(async (id: string) => {
	console.info("Fetching shortlink from origin");

	const ref = getShortlink(id);
	const snapshot = await getDoc(ref);
	const data = snapshot.data();
	const target = data?.[ShortlinkField.TARGET]?.[ShortlinkTargetField.PATH];

	return target;
});

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
	initFirebase();

	const params = await props.params;
	const id = params.id;
	const target = await getData(id);

	if (typeof target !== "string") notFound();
	else redirect(target, RedirectType.replace);
}
