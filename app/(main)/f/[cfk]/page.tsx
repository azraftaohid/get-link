import { compartCFK, createFID, getThumbnailKey } from "@/models/files";
import { NotFound } from "@/utils/errors/NotFound";
import { findFileIcon } from "@/utils/files";
import { initFirebase } from "@/utils/firebase";
import { compressImage } from "@/utils/images";
import { whenTruthy } from "@/utils/objects";
import { ProcessedFileData, makeProcessedFile } from "@/utils/processedFiles";
import { getDownloadURL, requireObject } from "@/utils/storage";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import FileView from "./FileView";

export const dynamic = "force-static";
export const dynamicParams = true;

function suppressError(error: unknown, cfk: string, subject: string) {
	if (error instanceof NotFound) console.warn(`${subject} not found [cfk: ${cfk}]`);
	else console.error(`Error getting ${subject} [cfk: ${cfk}]: `, error);
	return undefined;
}

const getData = cache(async (cfk: string) => {
	initFirebase();
	const tasks: Promise<unknown>[] = [];
	const components = compartCFK(cfk);
	const fileKey = createFID(components.displayName + components.ext, components.uid);

	const thumbnailKey = getThumbnailKey(fileKey);
	const thumbnailPromise = requireObject(thumbnailKey)
		.then(() => getDownloadURL(thumbnailKey))
		.catch(err => suppressError(err, cfk, "thumbnail"));
	tasks.push(thumbnailPromise);

	let processed: ProcessedFileData;
	try {
		processed = await makeProcessedFile(fileKey);
	} catch (error) {
		if (error instanceof NotFound) notFound();
		throw error;
	}
	(Object.keys(processed) as (keyof ProcessedFileData)[]).forEach(key => processed[key] === undefined && delete processed[key]);

	await Promise.all(tasks);

	return {
		fileKey,
		fileKeyComponents: components,
		thumbnail: (await thumbnailPromise) || null,
		...processed,
	};
});

export async function generateMetadata(props: { params: Promise<{ cfk: string }> }): Promise<Metadata> {
	const params = await props.params;
	const { name, fileKey, thumbnail, directLink, type } = await getData(decodeURIComponent(params.cfk));

	const image = whenTruthy(thumbnail || (type.startsWith("image/") && directLink), compressImage) ||
		findFileIcon(type);

	return {
		title: name || fileKey,
		openGraph: {
			images: image,
		},
		twitter: {
			images: image,
		}
	};
}

export default async function Page(props: Readonly<{ params: Promise<{ cfk: string }> }>) {
	const params = await props.params;
	const cfk = decodeURIComponent(params.cfk);
	const data = await getData(cfk);

	return <FileView cfk={cfk} {...data} />;
};
