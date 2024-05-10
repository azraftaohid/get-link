import { FileData, FileField, getFileKey, getThumbnailKey } from "@/models/files";
import { LinkData, LinkField, getLinkRef } from "@/models/links";
import { OrderField } from "@/models/order";
import { UserSnapshotField } from "@/models/users";
import { hasExpired } from "@/utils/dates";
import { NotFound } from "@/utils/errors/NotFound";
import { findFileIcon } from "@/utils/files";
import { initFirebase } from "@/utils/firebase";
import { whenTruthy } from "@/utils/objects";
import { ProcessedFileData, makeProcessedFile } from "@/utils/processedFiles";
import { getDownloadURL, getMetadata, requireObject } from "@/utils/storage";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { getCountFromServer, getDoc, getDocs, limit, query } from "firebase/firestore";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import LinkView from "./LinkView";
import { FETCH_LIMIT, makeFilesQuery } from "./helperComponents";

export const dynamicParams = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function suppressError(error: any, lid: string, subject: string) {
	if (error instanceof NotFound) {
		console.warn(`${subject} not found [lid: ${lid}]`);
	} else {
		console.error(`error getting ${subject} [lid: ${lid}]: `, error);
	}

	return undefined;
}

const getData = cache(async (lid: string): Promise<Data> => {
	console.log(`Generating static props for LID: ${lid}`);

	initFirebase();
	const tasks: Promise<unknown>[] = [];

	const linkRef = getLinkRef(lid);
	const snapshot = await getDoc(linkRef);

	const data = snapshot.data();
	if (!data) notFound();

	const {
		[LinkField.COVER]: cover,
		[LinkField.FILES]: files,
		[LinkField.CREATE_TIME]: createTime,
		[LinkField.EXPIRE_TIME]: expireTime,
	} = data;

	if (hasExpired(expireTime, createTime)) notFound();
	
	let isDynamic = false;
	let fileCount = 0;

	let thumbnailUrl: string | undefined;
	let coverUrl: string | undefined;
	let coverType: string | undefined;
	if (cover?.fid) {
		const coverKey = getFileKey(cover.fid);
		const thumbKey = getThumbnailKey(cover.fid);

		tasks.push(requireObject(thumbKey)
			.then(() => thumbnailUrl = getDownloadURL(thumbKey))
			.catch((err) => suppressError(err, lid, "thumbnail")));

		tasks.push(getMetadata(coverKey).then(value => {
			coverType = value.mimeType;
			coverUrl = getDownloadURL(coverKey);
		}).catch(err => suppressError(err, lid, "cover")));
	}

	const initFiles: (ProcessedFileData & { pos: number })[] = [];
	const pushInitFile = (fid: string, pos: number, pushData?: FileData) => {
		tasks.push(makeProcessedFile(fid, lid, pushData || data?.[LinkField.FILES]?.[fid])
			.then(res => initFiles.push({ ...res, pos }))
			.catch(err => {
				if (err instanceof NotFound) return;
				throw err;
			}));
	};

	if (files) {
		Object.keys(files).forEach(cfid => {
			const fileData = files[cfid];
			const fid = fileData[FileField.FID];
			const pos = fileData[OrderField.CREATE_ORDER] || 0;

			if (!fid) {
				console.warn(`skipping init file push [cfid: ${cfid}; cause: ${fid} is undefined]`);
				return;
			}

			pushInitFile(fid, pos, fileData);
		});
	} else {
		isDynamic = true;

		const filesQuery = makeFilesQuery(lid);
		tasks.push(getCountFromServer(filesQuery).then(value => {
			fileCount = value.data().count;
		}).catch(err => {
			console.error(`error getting file doc count [lid: ${lid}; cause: ${err}]`);
		}));

		const fileDocs = await getDocs(query(filesQuery, limit(FETCH_LIMIT)));
		fileDocs.docs.forEach(snapshot => {
			const {
				[FileField.FID]: fid,
				[FileField.LINKS]: links,
				...rest
			} = snapshot.data();

			const pos = links?.[lid]?.[OrderField.CREATE_ORDER];
			if (!fid || pos === undefined) return;

			pushInitFile(fid, pos, rest);
		});
	}

	console.debug("Awaiting task complete");
	await Promise.all(tasks);
	console.debug("Props are prepared; returning...");
	initFiles.sort((a, b) => a.pos - b.pos);

	const baseFile = initFiles[0];
	if (!baseFile) notFound();

	if (!coverUrl || !coverType) {
		coverUrl = baseFile.directLink;
		coverType = baseFile.type;
	}

	return {
		documentData: data,
		isDynamic,
		initFiles,
		fileCount: fileCount || initFiles.length,
		cover: {
			type: coverType,
			url: coverUrl,
		},
		thumbnail: thumbnailUrl || null,
	};
});

export async function generateMetadata({ params }: { params: { lid: string } }): Promise<Metadata> {
	const data = await getData(params.lid);
	const { thumbnail, cover } = data;

	const image = whenTruthy(thumbnail || (cover.type.startsWith("image/") && cover.url),
		url => `/_next/image?url=${url}&w=1200&q=75`) || findFileIcon(cover.type);

	return {
		title: data.documentData[LinkField.TITLE] || "Files",
		description: "Create and instantly share link of files and images.",
		openGraph: {
			images: image,
		},
		twitter: {
			images: image,
		},
	};
}

export default async function Page({ params }: Readonly<{ params: { lid: string } }>) {
	const lid = params.lid;

	const data = await getData(lid);
	const title = data.documentData[LinkField.TITLE];
	const uid = data.documentData[LinkField.USER]?.[UserSnapshotField.UID];
	const downloadSize = data.documentData[LinkField.DOWNLOAD_SIZE];

	const createSeconds = data.documentData[LinkField.CREATE_TIME]?.seconds;
	const strCreateTime = createSeconds !== undefined 
		? formatDate(new Date(createSeconds * 1000), "short", "year", "month", "day")
		: undefined;

	return <LinkView
		lid={lid}
		uid={uid}
		title={title}
		initFiles={data.initFiles}
		fileCount={data.fileCount}
		downloadSize={downloadSize}
		createTime={strCreateTime}
		isDynamic={data.isDynamic}
	/>;
}

type Data = {
	documentData: LinkData,
	isDynamic: boolean, // tells the client that more files may be fetched from the files collection
	initFiles: ProcessedFileData[]; // files to render initially; on first page load
	cover: {
		url: string;
		type: string;
	};
	thumbnail?: string | null;
	fileCount: number;
}
