import { formatDate } from "@thegoodcompany/common-utils-js";
import {
	documentId,
	FieldPath,
	getCountFromServer,
	getDoc,
	getDocs,
	limit,
	orderBy,
	Query,
	query,
	startAfter,
} from "firebase/firestore";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Masonry, { MasonryProps } from "react-masonry-css";
import { AssurePrompt } from "../../components/AssurePrompt";
import { Button } from "../../components/Button";
import { Conditional } from "../../components/Conditional";
import { CopyButton } from "../../components/CopyButton";
import { ExpandButton } from "../../components/ExpandButton";
import { FileCard } from "../../components/FileCard";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { Link } from "../../components/Link";
import { Loading } from "../../components/Loading";
import { Metadata } from "../../components/Meta";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { createCFID, FileData, FileField, getFileDocs, getFileKey, getThumbnailKey } from "../../models/files";
import { getLinkRef, LinkData, LinkField, releaseLink, Warning } from "../../models/links";
import { OrderField } from "../../models/order";
import { UserSnapshotField } from "../../models/users";
import { ClickEventContext, logClick } from "../../utils/analytics";
import { notFound } from "../../utils/common";
import { hasExpired } from "../../utils/dates";
import { shouldStepOutDownload, THRESHOLD_DIRECT_DOWNLOAD } from "../../utils/downloads";
import { NotFound } from "../../utils/errors/NotFound";
import { createViewLink, findFileIcon } from "../../utils/files";
import { initFirebase } from "../../utils/firebase";
import { initModernizr } from "../../utils/modernizr";
import { descriptiveNumber } from "../../utils/numbers";
import { whenTruthy } from "../../utils/objects";
import { quantityString } from "../../utils/quantityString";
import { getDownloadURL, getMetadata, requireObject } from "../../utils/storage";
import { makeProcessedFile, ProcessedFileData } from "../../utils/useProcessedFiles";
import { useToast } from "../../utils/useToast";
import { useUser } from "../../utils/useUser";
import { StaticSnapshot, toStatic } from "../api/staticSnapshot";
import { makeDownloadParams } from "../d";

const FETCH_LIMIT = 12;

initModernizr();

const msnryBreakpoitns: MasonryProps["breakpointCols"] = {
	default: 3,
	992: 2,
	576: 1,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function suppressError(error: any, lid: string, subject: string) {
	if (error instanceof NotFound) {
		console.warn(`${subject} not found [lid: ${lid}]`);
	} else {
		console.error(`error getting ${subject} [lid: ${lid}]: `, error);
	}

	return undefined;
}

function makeFilesQuery(lid: string, afterPos?: number, afterDocId?: string) {
	const baseQuery = query(getFileDocs(),
		orderBy(new FieldPath(FileField.LINKS, lid, OrderField.CREATE_ORDER), "asc"),
		orderBy(documentId(), "asc"));

	if (afterPos !== undefined && afterDocId !== undefined) return query(baseQuery, startAfter(afterPos, afterDocId));
	return baseQuery;
}

const DownloadFilesDialog = dynamic(() => import("../../components/DownloadFilesDialog"), {
	loading: () => <Loading />
});

const View: NextPage<Partial<StaticProps>> = ({
	isDynamic,
	snapshot,
	initFiles = [],
	fileCount = 0,
	cover,
	thumbnail,
}) => {
	const lid = snapshot?.id;

	const router = useRouter();
	const { makeToast } = useToast();
	const { user } = useUser();

	const [warns, setWarns] = useState(new Set<Warning>());

	const [showPrompt, setShowPrompt] = useState(true);

	const [isDeleting, setDeleting] = useState(false);
	const [showDeletePrompt, setShowDeletePrompt] = useState(false);

	const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
	const [stepOutDownload, setStepOutDownload] = useState(false);

	const [files, setFiles] = useState(initFiles);
	const [status, setStatus] = useState<"none" | "fetching" | "end" | "error">(files.length === fileCount ? "end" : "none");

	const title = snapshot?.data?.[LinkField.TITLE];
	const isUser = user && snapshot?.data?.[LinkField.USER]?.[UserSnapshotField.UID] === user.uid;
	const downloadSize = snapshot?.data?.[LinkField.DOWNLOAD_SIZE];

	useEffect(() => {
		// stored as state; update client after initial render because
		// prop value mismatch may cause href to not change on client w/o a re-render.
		setStepOutDownload(shouldStepOutDownload());
	}, []);

	useEffect(() => {
		const newWarns = new Set<Warning>();
		files?.forEach(file => {
			file.warnings?.forEach(warn => newWarns.add(warn));
		});

		setWarns(newWarns);
	}, [files]);

	if (!lid || !cover || !files[0]) {
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

	const fetchNext = () => {
		setStatus("fetching");
		console.log("fetching next filedocs");

		const lastDoc = files && files[files.length - 1];
		const nextQuery: Query<FileData> = makeFilesQuery(lid, lastDoc?.pos, lastDoc?.fid ? createCFID(lastDoc.fid) : undefined);
		console.log(`lastdoc: ${lastDoc?.fid}`);

		getDocs(query(nextQuery, limit(FETCH_LIMIT))).then(value => {
			const processedFilePromises = value.docs.map(doc => {
				const fileData = doc.data();
				const fid = fileData[FileField.FID];

				if (!fid) {
					console.warn(`fid not present on file doc [cfid: ${doc.id}]`);
					return;
				}

				return makeProcessedFile(fid, lid, fileData);
			});

			return Promise.all(processedFilePromises);
		}).then(value => {
			const filtered = value.filter(it => it !== undefined) as ProcessedFileData[];
			if (!filtered.length) {
				setStatus("end");
				return;
			}

			setFiles(c => [...c, ...filtered]);

			if (value.length % FETCH_LIMIT !== 0) setStatus("end");
			else setStatus("none");
		}).catch(err => {
			console.error(`error fetching next files [cause: ${err}]`);
			setStatus("error");
		});
	};

	return (
		<PageContainer>
			<Metadata
				title={title || "Files - Get Link"}
				description="Create and instantly share link of files and images."
				image={
					whenTruthy(thumbnail || (cover.type.startsWith("image/") && cover.url), 
					url => `/_next/image?url=${url}&w=1200&q=75`) || findFileIcon(cover.type)
				}
			/>
			<Header />
			<PageContent>
				<div className="vstack">
					<h1 className="text-break">{title || "Untitled"}</h1>
					<div className="d-flex align-items-top">
						<div>
							<p className="text-wrap mb-0">{strCreateTime}</p>
							<small className="text-muted mb-0">{descriptiveNumber(fileCount)} {quantityString("file", "files", fileCount)}</small>
						</div>
						<div className="d-flex flex-row ms-auto my-auto ps-2">
							<CopyButton
								variant="outline-vivid"
								content={createViewLink(lid, true)}
								left={<Icon name="link" size="sm" />}
								onClick={() => logClick("share")}
							>
								<span className="d-none d-md-inline">Share</span>
							</CopyButton>
							<Button
								className="ms-2"
								variant="outline-vivid"
								left={<Icon name="download" size="sm" />}
								href={fileCount === 1 && files[0] 
									? `d?${makeDownloadParams(files[0].directLink, files[0].name || "", files[0].size < THRESHOLD_DIRECT_DOWNLOAD ? "built-in" : "browser_default")}`
									: undefined}
								target="_blank"
								onClick={() => {
									if (fileCount === 1 && files[0]) return;
									setShowDownloadPrompt(true);
								}}
							>
								<span className="d-none d-md-inline">Download</span>
							</Button>
							{isUser && <Button
								className="ms-2"
								variant="outline-danger"
								left={<Icon name="delete" size="sm" />}
								onClick={() => setShowDeletePrompt(true)}
							>
								<span className="d-none d-md-inline">Delete</span>
							</Button>}
						</div>
					</div>
				</div>
				<hr className="mb-4" />
				<Conditional in={warns.has("executable")}>
					<Alert
						variant="warning"
						onClose={() => setWarns((c) => {
							c.delete("executable");
							return new Set(c);
						})}
						dismissible
					>
						This may be an executable file. Open only if you trust the owner.
					</Alert>
				</Conditional>
				<Masonry
					className="row g-4"
					columnClassName="vstack gap-4"
					breakpointCols={msnryBreakpoitns}
				>
					{files.map(({ fid, directLink, smThumbnailUrl, name, size, type, width, height }) => (
						<FileCard
							key={fid}
							name={name}
							directLink={directLink}
							placeholderUrl={smThumbnailUrl}
							size={size}
							type={type}
							width={width}
							height={height}
							isOwner={isUser}
							stepOutDownload={stepOutDownload}
						/>
					))}
				</Masonry>
				{isDynamic && <ExpandButton
					className="mt-4"
					state={status === "fetching" ? "loading" : "none"}
					onClick={fetchNext}
					disabled={status === "end" || status === "fetching"}
				>
					{status === "end" ? "End" : status === "error" ? "Error" : "Load more"}
				</ExpandButton>}
				<Conditional in={showPrompt}>
					<Alert variant="info" className="mt-4" onClose={() => setShowPrompt(false)} dismissible>
						Need link for a new file? Choose{" "}
						<Link variant="alert" href="/?open_chooser=true">
							here
						</Link>
						.
					</Alert>
				</Conditional>
				<DownloadFilesDialog
					lid={showDownloadPrompt && lid}
					files={!isDynamic && initFiles}
					show={showDownloadPrompt}
					saveAsPrefix={title}
					downloadSize={downloadSize}
					onHide={() => setShowDownloadPrompt(false)}
				/>
				<AssurePrompt
					title="Link will be deleted permanently"
					message="Are you sure you want to delete this link. Once deleted, it can not be recovered."
					show={showDeletePrompt}
					confirmProps={{ state: isDeleting ? "loading" : "none" }}
					onConfirm={async () => {
						setDeleting(true);

						const clickCtx: ClickEventContext = {};

						try {
							await releaseLink(lid);

							router.push("/");
							setShowDeletePrompt(false);
							makeToast("Link deleted successfully. It may take several minutes for updates to propagate.", "info");
							clickCtx.status = "succeed";
						} catch (error) {
							console.error(`error deleting file [cause: ${error}]`);
							makeToast(
								"Darn, we couldn't delete the link. Please try again later or file a report below.",
								"error"
							);
							clickCtx.status = "failed";
						}

						setDeleting(false);
						logClick("delete", clickCtx);
					}}
					onCancel={() => {
						setShowDeletePrompt(false);
						setDeleting(false);

						const clickCtx: ClickEventContext = { status: "canceled" };
						logClick("delete", clickCtx);
					}}
				/>
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
	initFirebase();

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
	} = staticSnapshot.data || {};

	if (hasExpired(expireTime, createTime)) return notFound;

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
		tasks.push(makeProcessedFile(fid, lid, pushData || staticSnapshot.data?.[LinkField.FILES]?.[fid])
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

	const baseFile = initFiles[0];
	if (!baseFile) return notFound;

	if (!coverUrl || !coverType) {
		coverUrl = baseFile.directLink;
		coverType = baseFile.type;
	}

	return {
		notFound: false,
		// revalidation is done via the api route: /api/revalidate
		props: {
			isDynamic,
			initFiles: initFiles.sort((a, b) => a.pos - b.pos), // NOSONAR
			fileCount: fileCount || initFiles.length,
			cover: {
				type: coverType,
				url: coverUrl,
			},
			thumbnail: thumbnailUrl || null,
			snapshot: staticSnapshot,
		},
	};
};

export default View;

interface StaticProps {
	snapshot: StaticSnapshot<LinkData>;
	isDynamic: boolean, // tells the client that more files may be fetched from the files collection
	initFiles: ProcessedFileData[]; // files to render intially; on first page load
	cover: {
		url: string;
		type: string;
	};
	thumbnail?: string | null;
	fileCount: number;
}

interface Segments extends ParsedUrlQuery {
	lid: string;
}
