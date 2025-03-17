import { COLLECTION_SHORTLINK, ShortlinkField, ShortlinkTargetField } from "@/models/shortlinks";
import { initFirebase } from "@/utils/firebase";
import { initFirestoreLite } from "@/utils/firestore_lite";
import { collection, doc, getDoc, getFirestore } from "firebase/firestore/lite";
import { unstable_cache } from "next/cache";
import { notFound, redirect, RedirectType } from "next/navigation";

export const dynamic = "force-static";
export const dynamicParams = true;

const getData = unstable_cache(async (id: string) => {
	console.info("Fetching shortlink from origin");

	const shortlinks = collection(getFirestore(), COLLECTION_SHORTLINK);
	const ref = doc(shortlinks, id);
	
	const snapshot = await getDoc(ref);
	const data = snapshot.data();
	const target = data?.[ShortlinkField.TARGET]?.[ShortlinkTargetField.PATH];

	return target;
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	const firebase = initFirebase();
	initFirestoreLite(firebase);

	const id = params.id;
	const target = await getData(id);

	if (typeof target !== "string") notFound();
	else redirect(target, RedirectType.replace);
}
