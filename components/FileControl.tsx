import { makeDownloadParams } from "@/app/d/helpers";
import { useState } from "react";
import { ClickEventContext, logClick } from "../utils/analytics";
import { THRESHOLD_DIRECT_DOWNLOAD, directDownloadFromUrl } from "../utils/downloads";
import { FetchError } from "../utils/errors/FetchError";
import { Falsy } from "../utils/falsy";
import { mergeNames } from "../utils/mergeNames";
import { formatSize } from "../utils/strings";
import { useNumber } from "../utils/useNumber";
import { useToast } from "../utils/useToast";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import { Icon } from "./Icon";

const PROGRESS_STEP = 3;

export const FileControl: React.FunctionComponent<FileControlProps> = ({
	className,
	isOwner = false,
	directLink,
	name,
	size,
	stepOutDownload = true,
	...rest
}) => {
	const { makeToast } = useToast();

	const [downloadProgress, setDownloadProgress] = useNumber(0);
	const [isDownloading, setDownloading] = useState(false);

	const downloadMechanism: ClickEventContext["mechanism"] =
		size >= THRESHOLD_DIRECT_DOWNLOAD ? "browser_default" : "built-in";

	return <>
		<div className={mergeNames("d-flex align-items-center", className)} {...rest}>
			<p className="text-muted text-wrap mb-0">{formatSize(size)}</p>
			<div className="d-flex flex-row ms-auto ps-2">
				<Conditional
					in={isDownloading}
					className={mergeNames(isDownloading && "d-inline-flex", "align-items-center")}
					direction="horizontal"
				>
					<p className="me-2 my-0 text-nowrap">{downloadProgress}%</p>
				</Conditional>
				<Button
					variant="outline-vivid"
					href={
						stepOutDownload
							? `/d?${makeDownloadParams(directLink, name || "", downloadMechanism)}`
							: directLink
					}
					onClick={async (evt) => {
						const clickCtx: ClickEventContext = {
							mechanism: downloadMechanism,
						};

						if (downloadMechanism === "built-in" && !stepOutDownload) {
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
					download={name || true}
					left={<Icon name="file_download" size="sm" />}
					disabled={isDownloading}
				>
					<span className={mergeNames(isOwner ? "d-none d-md-inline" : "d-inline")}>Download</span>
				</Button>
			</div>
		</div>
	</>;
};

export interface FileControlProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	isOwner?: boolean | Falsy,
	directLink: string,
	name?: string,
	size: number,
	stepOutDownload?: boolean,
}
