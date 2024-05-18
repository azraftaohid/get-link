"use client";

import { makeDownloadParams } from "@/app/d/helpers";
import { AssurePrompt } from "@/components/AssurePrompt";
import { Button } from "@/components/Button";
import { Conditional } from "@/components/Conditional";
import { CopyButton } from "@/components/CopyButton";
import { ExpandButton } from "@/components/ExpandButton";
import { Icon } from "@/components/Icon";
import Link from "@/components/Link";
import { Loading } from "@/components/Loading";
import { ViewHeader } from "@/components/ViewHeader";
import { FileCard } from "@/components/cards/FileCard";
import { FileData, FileField, createCFID } from "@/models/files";
import { Warning, releaseLink } from "@/models/links";
import { ClickEventContext, logClick } from "@/utils/analytics";
import { THRESHOLD_DIRECT_DOWNLOAD, shouldStepOutDownload } from "@/utils/downloads";
import { createViewLink } from "@/utils/files";
import { initModernizr } from "@/utils/modernizr";
import { descriptiveNumber } from "@/utils/numbers";
import { ProcessedFileData, makeProcessedFile } from "@/utils/processedFiles";
import { quantityString } from "@/utils/quantityString";
import { makeShortlink } from "@/utils/shortlinks";
import { copyToClipboard } from "@/utils/system";
import { useAppRouter } from "@/utils/useAppRouter";
import { useToast } from "@/utils/useToast";
import { useUser } from "@/utils/useUser";
import { Query, getDocs, limit, query } from "firebase/firestore";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownItem from "react-bootstrap/DropdownItem";
import DropdownMenu from "react-bootstrap/DropdownMenu";
import DropdownToggle from "react-bootstrap/DropdownToggle";
import Spinner from "react-bootstrap/Spinner";
import Masonry, { MasonryProps } from "react-masonry-css";
import { FETCH_LIMIT, makeFilesQuery } from "./helperComponents";

// changes to this must be reflected on FileView image sizes
const msnryBreakpoints: MasonryProps["breakpointCols"] = {
	default: 3,
	992: 2,
	576: 1,
};

const DownloadFilesDialog = dynamic(() => import("@/components/DownloadFilesDialog"), {
	loading: () => <Loading />
});

export default function LinkView({
	lid,
	uid,
	title,
	initFiles,
	fileCount,
	downloadSize,
	createTime,
	isDynamic,
}: Readonly<LinkViewProps>) {
	const router = useAppRouter();
	const { makeToast } = useToast();
	const { user } = useUser();

	const [warns, setWarns] = useState(new Set<Warning>());

	const [showPrompt, setShowPrompt] = useState(true);

	const [isDeleting, setDeleting] = useState(false);
	const [showDeletePrompt, setShowDeletePrompt] = useState(false);

	const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
	const [stepOutDownload, setStepOutDownload] = useState(false);

	const [shortlinkState, setShortlinkState] = useState<"none" | "loading">("none");

	const [files, setFiles] = useState(initFiles);
	const [status, setStatus] = useState<"none" | "fetching" | "end" | "error">(files.length === fileCount ? "end" : "none");

	useEffect(() => {
		initModernizr();
	});

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

	const isUser = uid && (uid === user?.uid);
	return <>
		<ViewHeader
			primaryText={title || "Untitled"}
			secondaryText={createTime}
			tertiaryText={descriptiveNumber(fileCount) + " " + quantityString("file", "files", fileCount)}
			actions={<>
				<Dropdown as={ButtonGroup} autoClose={"outside"} onSelect={async (key) => {
					if (key === "shortlink") {
						setShortlinkState("loading");

						let shortlink: string;
						try {
							shortlink = await makeShortlink(createViewLink(lid));
						} catch (error) {
							console.error("Shortlink create failed:", error);
							makeToast("Sorry, we couldn't make that shortlink!", "error");
							setShortlinkState("none");
							return;
						}

						try {
							await copyToClipboard(shortlink);
						} catch (error) {
							console.error("Copy to clipboard failed:", error);
							makeToast("Here is your shortlink: " + shortlink);
							return;
						} finally {
							setShortlinkState("none");
						}

						makeToast("Shortlink copied to clipboard.");
					}
				}}>
					<CopyButton
						variant="outline-vivid"
						content={createViewLink(lid, true)}
						left={<Icon name="link" size="sm" />}
						onClick={() => logClick("share")}
					>
						<span className="d-none d-md-inline">Share</span>
					</CopyButton>
					<Button
						variant="outline-vivid"
						left={<Icon name="download" size="sm" />}
						href={files[0] && `/d?${makeDownloadParams(files[0].directLink, files[0].name || "", files[0].size < THRESHOLD_DIRECT_DOWNLOAD ? "built-in" : "browser_default")}`}
						target="_blank"
						download={stepOutDownload ? files[0]?.name || true : false} // step out download is only true when download is not supported by browser
						onClick={(evt) => {
							if (fileCount === 1 && files[0]) return;

							evt.preventDefault();
							setShowDownloadPrompt(true);
						}}
					>
						<span className="d-none d-md-inline">Download</span>
					</Button>
					<DropdownToggle split variant="outline-vivid" id="share-options-dropdown" />
					<DropdownMenu>
						<DropdownItem eventKey={"shortlink"}>
							{shortlinkState === "none"
								? <Icon className="align-middle" name="content_copy" size="sm" />
								: <Spinner as="span" role="output" animation="border" size="sm" aria-hidden />}{" "}
							Copy shortlink
						</DropdownItem>
					</DropdownMenu>
				</Dropdown>
				{isUser && <Button
					className="ms-2"
					variant="outline-danger"
					left={<Icon name="delete" size="sm" />}
					onClick={() => setShowDeletePrompt(true)}
				>
					<span className="d-none d-md-inline">Delete</span>
				</Button>}
			</>}
		/>
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
			breakpointCols={msnryBreakpoints}
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
					fileCount={fileCount || files.length}
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
	</>;
}

export interface LinkViewProps {
	lid: string,
	uid?: string,
	title?: string,
	downloadSize?: number,
	createTime?: string,
	isDynamic: boolean,
	initFiles: ProcessedFileData[],
	fileCount: number,
}
