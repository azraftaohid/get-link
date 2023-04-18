import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth } from "firebase/auth";
import { deleteObject } from "firebase/storage";
import { useRouter } from "next/router";
import { useState } from "react";
import { getFileRef } from "../models/files";
import { LinkField, releaseLink } from "../models/links";
import { makeDownloadParams } from "../pages/d";
import { ClickEventContext, logClick } from "../utils/analytics";
import { directDownloadFromUrl } from "../utils/downloads";
import { createViewLink } from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { formatSize } from "../utils/strings";
import { useNumber } from "../utils/useNumber";
import { useToast } from "../utils/useToast";
import { AssurePrompt } from "./AssurePrompt";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";

export const FileControl: React.FunctionComponent<FileControlProps> = () => {
	const { data: user } = useAuthUser(["user"], getAuth());
	const [showPrompt, setShowPrompt] = useState(true);

	const router = useRouter();
	const { makeToast } = useToast();

	const [showDeletePromt, setShowDeletePrompt] = useState(false);

	const [downloadProgress, setDownloadProgress] = useNumber(0);

	const [isDeleting, setDeleting] = useState(false);
	const [isDownloading, setDownloading] = useState(false);

	const isUser = user && snapshot.data?.[LinkField.USER]?.[UserSnapshotField.UID] === user.uid;
	const downloadMechanism: ClickEventContext["mechanism"] =
		size >= THRESHOLD_DIRECT_DOWNLOAD ? "browser_default" : "built-in";

	return <>
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
					content={createViewLink(snapshot.id, true)}
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
		</div>;
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
	</>;
};

export interface FileControlProps {

}
