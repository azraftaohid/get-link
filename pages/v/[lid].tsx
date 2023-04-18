import { Days, Minutes, formatDate } from "@thegoodcompany/common-utils-js";
import { getDoc, getDocs, limit, query } from "firebase/firestore/lite";
import { FullMetadata, getDownloadURL, getMetadata } from "firebase/storage";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import { Conditional } from "../../components/Conditional";
import { FileControl } from "../../components/FileControl";
import { FileView } from "../../components/FileView";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Link } from "../../components/Link";
import { Loading } from "../../components/Loading";
import { Metadata } from "../../components/Meta";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { DimensionField } from "../../models/dimension";
import { File, FileField, getFileDocs, getFileRef, getThumbnailRef } from "../../models/files";
import { LinkData, LinkField, Warning, getLinkRef } from "../../models/links";
import styles from "../../styles/cfid.module.scss";
import { notFound } from "../../utils/common";
import { hasExpired } from "../../utils/dates";
import { shouldStepUpDownload } from "../../utils/downloads";
import { findFileIcon, isExecutable } from "../../utils/files";
import { mergeNames } from "../../utils/mergeNames";
import { initModernizr } from "../../utils/modernizr";
import { StaticSnapshot, toStatic } from "../api/staticSnapshot";

initModernizr();

const PROGRESS_STEP = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function suppressError(error: any, cfid: string, subject: string) {
	if (error.code === "storage/object-not-found") {
		console.warn(`${subject} not found [cfid: ${cfid}]`);
	} else {
		console.error(`error getting ${subject} [cfid: ${cfid}]`);
	}

	return undefined;
}

const View: NextPage<InferGetStaticPropsType<typeof getStaticProps>> = ({
	isDynamic,
	snapshot,
	initFiles,
	cover,
	thumbnail,
	thumbnailSmall,
	warnings: _warns,
}) => {
	const [warns, setWarns] = useState(_warns);
	const [stepUpDownload, setStepUpDownload] = useState(false);

	const [files, setFiles] = useState(initFiles);

	useEffect(() => {
		// stored as state; update client after initial render because
		// prop value mismatch may cause href to not change on client w/o a re-render.
		setStepUpDownload(shouldStepUpDownload());
	}, []);

	if (!files?.[0]) {
		return (
			<PageContainer>
				<Header />
				<PageContent>
					<Loading />
				</PageContent>
				<Footer />
			</PageContainer>
		);
	}

	const createSeconds = snapshot.data?.[LinkField.CREATE_TIME]?.seconds;
	const strCreateTime = createSeconds && formatDate(new Date(createSeconds * 1000), "short", "year", "month", "day");

	return (
		<PageContainer>
			<Metadata
				title={snapshot.data?.[LinkField.TITLE] || "Get Link"}
				description="Create and instantly share link of files and images."
				image={thumbnail || thumbnailSmall || (cover.type.startsWith("image/") && cover.url) || findFileIcon(cover.type)}
			/>
			<Header />
			<PageContent>
				<Conditional in={warns?.includes("executable")}>
					<Alert
						variant="warning"
						onClose={() => setWarns((c) => [...c.filter((v) => v !== "executable")])}
						dismissible
					>
						This may be an executable file. Open only if you trust the owner.
					</Alert>
				</Conditional>
				{files.map(({ directLink, thumbnailDataUrl, size, type, width, height }) => <>
					<FileView
						className={mergeNames(styles.fView, "mb-3")}
						src={directLink}
						placeholderUrl={}
						size={size}
						type={type}
						width={width}
						height={height}
					/>
					<FileControl

					/>
				</>)}
				<FileView
					className={mergeNames(styles.fView, "mb-3")}
					src={directLink}
					placeholderDataUrl={thumbnailDataUrl}
					size={size}
					type={type}
					width={width}
					height={height}
				/>
				
				<Conditional in={showPrompt}>
					<Alert variant="info" className="mt-4" onClose={() => setShowPrompt(false)} dismissible>
						Need link for a new file? Choose{" "}
						<Link variant="alert" href="/?open_chooser=true">
							here
						</Link>
						.
					</Alert>
				</Conditional>
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		fallback: true,
		paths: [],
	};
};

export const getStaticProps: GetStaticProps<StaticProps, Segments> = async ({ params }) => {
	const lid = params?.lid;
	if (typeof lid !== "string") return notFound;

	console.log(`generating static props [lid: ${lid}]`);

	const tasks: Promise<unknown>[] = [];

	const linkRef = getLinkRef(lid);
	const snapshot = await getDoc(linkRef);
	if (!snapshot.exists()) return notFound;

	const staticSnapshot = toStatic(snapshot);
	const {
		[LinkField.COVER]: cover,
		[LinkField.FILES]: files,
		[LinkField.CREATE_TIME]: createTime,
		[LinkField.EXPIRE_TIME]: expireTime,
	} = staticSnapshot.data || { };

	if (hasExpired(expireTime, createTime)) return notFound;

	let isDynamic = false;

	let smThumbnailUrl: string | undefined;
	let thumbailUrl: string | undefined;
	let coverUrl: string | undefined;
	let coverType: string | undefined;
	if (cover?.fid) {
		const coverRef = getFileRef(cover.fid);
		const thumbnailRef = getThumbnailRef(cover.fid, "1024x1024");
		const smThumbnailRef = getThumbnailRef(cover.fid, "56x56");
		
		tasks.push(getDownloadURL(thumbnailRef)
			.then(url => thumbailUrl = url)
			.catch((err) => suppressError(err, lid, "thumbnail")));
		
		tasks.push(getDownloadURL(smThumbnailRef)
			.then()
			.catch((err) => suppressError(err, lid, "small thumbnail")));

		tasks.push(getDownloadURL(coverRef)
			.then(url => coverUrl = url)
			.catch(err => suppressError(err, lid, "cover")));

		tasks.push(getMetadata(coverRef)
			.then(metadata => coverType = metadata.contentType)
			.catch(err => suppressError(err, lid, "cover (metadata)")));
	}

	const warnings = new Set<Warning>();
	const initFiles: (StaticFile & { pos: number })[] = [];
	const pushInitFile = (fid: string, pos: number, _redunt?: unknown, pushData?: File) => {
		const ref = getFileRef(fid);
		let directLink: string | undefined;
		let metadata: FullMetadata | undefined;

		const pushPromise = Promise.all([
			getDownloadURL(ref).then(url => directLink = url),
			getMetadata(ref).then(value => metadata = value),
		]).then(() => {
			if (!directLink || !metadata) return;

			const info = pushData || staticSnapshot.data?.[LinkField.FILES]?.[pos] || { };
			const overrides = info[FileField.OVERRIDES] || { };
			const type = metadata.contentType || "application/octet-stream";

			initFiles.push({
				directLink, pos, type, 
				size: metadata.size,
				width: +(overrides[DimensionField.WIDTH] || metadata.customMetadata?.width || 0) || null,
				height: +(overrides[DimensionField.HEIGHT] || metadata.customMetadata?.height || 0) || null,
			});

			(info[FileField.WARNS] || (isExecutable(type) ? ["executable"] : [])).forEach(warn => {
				warnings.add(warn);
			});
		}).catch(err => {
			if (err.code === "storage/object-not-found") return;
			throw err;
		});

		tasks.push(pushPromise);
	};

	if (files) {
		Object.keys(files).forEach(pushInitFile);
	} else {
		isDynamic = true;
		
		const fileDocs = await getDocs(query(getFileDocs(lid), limit(12)));
		fileDocs.docs.forEach(snapshot => {
			const {
				[FileField.FID]: fid,
				[FileField.POSITION]: position = 0,
				...rest
			} = snapshot.data();

			if (!fid) return;
			pushInitFile(fid, position, null, rest);
		});
	}

	await Promise.all(tasks);
	
	const baseFile = initFiles[0];
	if (!baseFile) return notFound;

	if (!coverUrl || !coverType) {
		coverUrl = baseFile.directLink;
		coverType = baseFile.type;
	}

	return {
		notFound: false,
		revalidate: (isDynamic ? new Minutes(5) : new Days(1)).toSeconds().value,
		props: {
			isDynamic,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			initFiles: initFiles.sort((a, b) => a.pos - b.pos).map(({ pos, ...rest }) => ({ ...rest })),
			cover: {
				type: coverType,
				url: coverUrl,
			},
			thumbnail: thumbailUrl || null,
			thumbnailSmall: smThumbnailUrl || null,
			snapshot: staticSnapshot,
			warnings: Array.from(warnings),
		},
	};
};

export default View;

interface StaticProps {
	snapshot: StaticSnapshot<LinkData>;
	isDynamic: boolean,
	initFiles: StaticFile[];
	cover: {
		url: string;
		type: string;
	};
	thumbnail?: string | null;
	thumbnailSmall?: string | null;
	warnings: Warning[],
}

interface StaticFile {
	directLink: string,
	type: string,
	size: number,
	width?: number | null,
	height?: number | null,
	smThumbnailUrl?: string,
	thumbnailDataUrl?: string | null;
}

interface Segments extends ParsedUrlQuery {
	lid: string;
}
