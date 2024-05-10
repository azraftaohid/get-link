import { ShortlinkField, ShortlinkTargetField, getShortlink } from "@/models/shortlinks";
import { initFirebase } from "@/utils/firebase";
import { getDoc } from "firebase/firestore";
import { RedirectType, notFound, redirect } from "next/navigation";

export const dynamicParams = true;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	initFirebase();

	const id = params.id;
	const ref = getShortlink(id);
	const snapshot = await getDoc(ref);
	const data = snapshot.data();
	const target = data?.[ShortlinkField.TARGET]?.[ShortlinkTargetField.PATH];

	if (typeof target !== "string") notFound();
	else redirect(target, RedirectType.replace);
}
