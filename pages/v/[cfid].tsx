import { useAuthUser } from "@react-query-firebase/auth";
import { Days, formatDate } from "@thegoodcompany/common-utils-js";
import { getAuth } from "firebase/auth";
import { getDoc } from "firebase/firestore/lite";
import { deleteObject, getDownloadURL, getMetadata } from "firebase/storage";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage } from "next";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import { AssurePrompt } from "../../components/AssurePrompt";
import { Button } from "../../components/Button";
import { Conditional } from "../../components/Conditional";
import { CopyButton } from "../../components/CopyButton";
import { FileView } from "../../components/FileView";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { Link } from "../../components/Link";
import { Loading } from "../../components/Loading";
import { Metadata } from "../../components/Meta";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { DimensionField } from "../../models/dimension";
import { getFileRef, getThumbnailRef } from "../../models/files";
import { getLinkRef, LinkData, LinkField, releaseLink, Warning } from "../../models/links";
import { UserSnapshotField } from "../../models/users";
import styles from "../../styles/cfid.module.scss";
import { ClickEventContext, logClick } from "../../utils/analytics";
import { notFound } from "../../utils/common";
import { hasExpired } from "../../utils/dates";
import { directDownloadFromUrl, getBlob, shouldStepUpDownload, THRESHOLD_DIRECT_DOWNLOAD } from "../../utils/downloads";
import { FetchError } from "../../utils/errors/FetchError";
import { createFileLink, FileCustomMetadata, findFileIcon, isExecutable } from "../../utils/files";
import { mergeNames } from "../../utils/mergeNames";
import { initModernizr } from "../../utils/modernizr";
import { formatSize } from "../../utils/strings";
import { useNumber } from "../../utils/useNumber";
import { useToast } from "../../utils/useToast";
import { StaticSnapshot, toStatic } from "../api/staticSnapshot";
import { makeDownloadParams } from "../d";

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
	snapshot,
	name,
	directLink,
	thumbnail,
	thumbnailSmall,
	type,
	size,
	width,
	height,
	thumbnailDataUrl: tDataUrl,
	warnings: _warns = [],
}) => {
	const router = useRouter();
	const { makeToast } = useToast();

	const { data: user } = useAuthUser(["user"], getAuth());

	const [showDeletePromt, setShowDeletePrompt] = useState(false);
	const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | undefined>(tDataUrl || undefined);

	const [isDeleting, setDeleting] = useState(false);
	const [isDownloading, setDownloading] = useState(false);
	const [warns, setWarns] = useState(_warns);
	const [showPrompt, setShowPrompt] = useState(true);

	const [stepUpDownload, setStepUpDownload] = useState(false);
	const [downloadProgress, setDownloadProgress] = useNumber(0);

	useEffect(() => {
		if (!thumbnailSmall) return;

		console.debug("loading thumbnail");
		getBlob(thumbnailSmall).then((blob) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				console.debug("thumbnail data url loaded");
				const result = reader.result;
				if (typeof result !== "string") setThumbnailDataUrl(undefined);
				else setThumbnailDataUrl(result);
			};

			reader.onerror = () => {
				console.warn(`thumbnail data url load failed [status: ${reader.error}]`);
			};

			reader.readAsDataURL(blob);
		});
	}, [thumbnailSmall]);

	useEffect(() => {
		// stored as state; update client after initial render because
		// prop value mismatch may cause href to not change on client w/o a re-render.
		setStepUpDownload(shouldStepUpDownload());
	}, []);

	if (!directLink) {
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

	const isUser = user && snapshot.data?.[LinkField.USER]?.[UserSnapshotField.UID] === user.uid;
	const downloadMechanism: ClickEventContext["mechanism"] =
		size >= THRESHOLD_DIRECT_DOWNLOAD ? "browser_default" : "built-in";

	return (
		<PageContainer>
			<Metadata
				title={snapshot.data?.[LinkField.TITLE] || snapshot.data?.[LinkField.NAME] || "Get Link"}
				description="Create and instantly share link of files and images."
				image={thumbnail || thumbnailSmall || (type.startsWith("image/") && directLink) || findFileIcon(type)}
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
				<FileView
					className={mergeNames(styles.fView, "mb-3")}
					src={directLink}
					placeholderDataUrl={thumbnailDataUrl}
					size={size}
					type={type}
					width={width}
					height={height}
				/>
				<div>
					<div className="float-end d-flex flex-row ps-2">
						<Conditional
							in={isDownloading}
							className={mergeNames(isDownloading && "d-inline-flex", "align-items-center")}
							direction="horizontal"
						>
							<p className="me-2 my-0">{downloadProgress}%</p>
						</Conditional>
						<Button
							className="me-2"
							variant="outline-vivid"
							href={
								stepUpDownload
									? `d?${makeDownloadParams(directLink, name, downloadMechanism)}`
									: directLink
							}
							onClick={async (evt) => {
								const clickCtx: ClickEventContext = {
									mechanism: downloadMechanism,
								};

								if (downloadMechanism === "built-in" && !stepUpDownload) {
									evt.preventDefault();
									setDownloading(true);

									try {
										let prevProgress = 0;
										await directDownloadFromUrl(directLink, name, (received, total) => {
											const newProgress = Math.round((received / total) * 100);
											if (newProgress !== 100 && newProgress - prevProgress < PROGRESS_STEP)
												return;

											setDownloadProgress.to((prevProgress = newProgress));
										});

										clickCtx.status = "succeed";
									} catch (error) {
										console.error(`error getting blob from direct link [cause: ${error}]`);
										if (error instanceof FetchError && error.code === 404) {
											makeToast("The file is no longer available.", "warning");
										} else {
											window.open(directLink, "_blank");
										}

										clickCtx.status = "failed";
									}

									setDownloading(false);
								}

								logClick("download", clickCtx);
							}}
							state={isDownloading ? "loading" : "none"}
							target="_blank"
							download={name}
							left={<Icon name="file_download" size="sm" />}
							disabled={isDownloading}
						>
							<span className={mergeNames(isUser ? "d-none d-md-inline" : "d-inline")}>Download</span>
						</Button>
						<CopyButton
							variant="outline-vivid"
							content={createFileLink(snapshot.id, true)}
							left={<Icon name="link" size="sm" />}
							onClick={() => logClick("share")}
						>
							<span className="d-none d-md-inline">Share</span>
						</CopyButton>
						{isUser && (
							<Button
								className="ms-2"
								variant="outline-danger"
								left={<Icon name="delete" size="sm" />}
								onClick={() => setShowDeletePrompt(true)}
							>
								<span className="d-none d-md-inline">Delete</span>
							</Button>
						)}
					</div>
					<p className="text-wrap">
						<small className="d-block text-muted">{formatSize(size)}</small>
						{strCreateTime}
					</p>
				</div>
				<Conditional in={showPrompt}>
					<Alert variant="info" className="mt-4" onClose={() => setShowPrompt(false)} dismissible>
						Need link for a new file? Choose{" "}
						<Link variant="alert" href="/?open_chooser=true">
							here
						</Link>
						.
					</Alert>
				</Conditional>
				<AssurePrompt
					title="File will be deleted permanently"
					message="Are you sure you want to delete this file. Once deleted, it can not be recovered."
					show={showDeletePromt}
					confirmProps={{ state: isDeleting ? "loading" : "none" }}
					onConfirm={async () => {
						setDeleting(true);

						const clickCtx: ClickEventContext = {};
						const fid = snapshot.data?.[LinkField.FID];

						try {
							if (!fid) throw new Error(`fid is undefined [cfid: ${snapshot.id}]`);

							const fileRef = getFileRef(fid);
							await deleteObject(fileRef);
							await releaseLink(snapshot.id);

							router.push("/");
							setShowDeletePrompt(false);
							makeToast("File deleted successfully.", "info");
							clickCtx.status = "succeed";
						} catch (error) {
							console.error(`error deleting file [cause: ${error}]`);
							makeToast(
								"Darn, we couldn't delete the file. Please try again later or file a report below.",
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
	const cfid = params?.cfid;
	if (typeof cfid !== "string") return notFound;

	console.log(`generating static props [cfid: ${cfid}]`);

	const linkRef = getLinkRef(cfid);
	const snapshot = await getDoc(linkRef);
	if (!snapshot.exists()) return notFound;

	const staticSnapshot = toStatic(snapshot);
	const fid = staticSnapshot.data?.[LinkField.FID];
	const createTime = staticSnapshot.data?.[LinkField.CREATE_TIME];
	const expireTime = staticSnapshot.data?.[LinkField.EXPIRE_TIME];
	if (!fid || hasExpired(expireTime, createTime)) return notFound;

	const ref = getFileRef(fid);
	const thumbnailRef = getThumbnailRef(fid, "1024x1024");
	const smThumbnailRef = getThumbnailRef(fid, "56x56");

	const getUrl = getDownloadURL(ref);
	const getMetas = getMetadata(ref).catch((err) => suppressError(err, cfid, "metadata"));
	const getThumbnailUrl = getDownloadURL(thumbnailRef).catch((err) => suppressError(err, cfid, "thumbnail"));
	const getSmThumbnailUrl = getDownloadURL(smThumbnailRef).catch((err) =>
		suppressError(err, cfid, "small thumbnail")
	);

	let downloadUrl: string;
	let name: string;
	let type: string;
	let size: number;
	let width: string | number | undefined;
	let height: string | number | undefined;
	try {
		downloadUrl = await getUrl;
		const metas = await getMetas;
		if (!metas) throw new Error(`object metadata get failed [cfid: ${cfid}]`);

		name = metas.name;
		type = metas.contentType || "application/octet-stream";
		size = metas.size;
		width = (metas.customMetadata as FileCustomMetadata)?.width;
		height = (metas.customMetadata as FileCustomMetadata)?.height;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		if (error.code === "storage/object-not-found") return notFound;
		throw error;
	}

	const smThumbnailUrl = await getSmThumbnailUrl;
	const thumbailUrl = await getThumbnailUrl;

	const staticMetas = staticSnapshot.data?.[LinkField.FILE];
	return {
		notFound: false,
		revalidate: new Days(1).toSeconds().value,
		props: {
			name: name,
			type: type,
			size: size,
			width: +(staticMetas?.[DimensionField.WIDTH] || width || 0) || null,
			height: +(staticMetas?.[DimensionField.HEIGHT] || height || 0) || null,
			directLink: downloadUrl,
			thumbnail: thumbailUrl || null,
			thumbnailSmall: smThumbnailUrl || null,
			snapshot: staticSnapshot,
			warnings: staticSnapshot.data?.[LinkField.WARNS] || (isExecutable(type) ? ["executable"] : []),
		},
	};
};

export default View;

interface StaticProps {
	name: string;
	directLink: string;
	thumbnail?: string | null;
	thumbnailSmall?: string | null;
	type: string;
	size: number;
	width?: number | null;
	height?: number | null;
	snapshot: StaticSnapshot<LinkData>;
	thumbnailDataUrl?: string | null;
	warnings?: Warning[];
}

interface Segments extends ParsedUrlQuery {
	cfid: string;
}
