"use client";

import { Conditional } from "@/components/Conditional";
import { DownloadProgress } from "@/components/DownloadProgress";
import Link from "@/components/Link";
import { Loading } from "@/components/Loading";
import { ClickEventContext } from "@/utils/analytics";
import { directDownloadFromUrl } from "@/utils/downloads";
import { FetchError } from "@/utils/errors/FetchError";
import { isValidDirectLink, makeDirectLink } from "@/utils/files";
import { useSearchParams } from "next/navigation";
import { LegacyRef, useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/esm/Alert";

export default function Page() {
	const search = useSearchParams();

	const aRef: LegacyRef<HTMLAnchorElement> = useRef(null);
	const hasClicked = useRef(false);

	const [error, setError] = useState<string>();
	const [size, setSize] = useState(0);
	const [downloaded, setDownloaded] = useState(0);

	const name = search?.get("name");
	const path = search?.get("path");
	const token = search?.get("token");
	const dl = search?.get("dl");
	const mechanism = search?.get("mechanism") as ClickEventContext["mechanism"];

	let directLink: string | undefined;
	if (typeof dl === "string") directLink = decodeURIComponent(dl);
	else if (typeof path === "string" && typeof token === "string") directLink = makeDirectLink(path, token);

	useEffect(() => {
		if (hasClicked.current || !aRef.current) return;

		hasClicked.current = true;
		aRef.current.click();
	});

	const directLinkIsValid = directLink && isValidDirectLink(directLink);
	const displayError = !!error || !directLinkIsValid;

	return <>
		<Conditional in={displayError}>
			<Alert variant="danger">{error || "Invalid download link."}</Alert>
		</Conditional>
		<Conditional in={!displayError}>
			<>
				<Conditional in={size === 0 && mechanism !== "browser_default"}>
					<Loading />
				</Conditional>
				<Conditional in={size === 0 && mechanism === "browser_default"}>
					<Alert>
						{/* storing a state object may rather be a over-work; better optimized for the most cases. */}
						Your download should be started.
					</Alert>
				</Conditional>
				<Conditional in={size !== 0}>
					<>
						<DownloadProgress
							label={`Downloading${name ? ` ${name}` : ""}`}
							size={size}
							loaded={downloaded}
						/>
						<Link variant="reset" href={directLink || "#"} newTab>
							Open instead
						</Link>
					</>
				</Conditional>
				{directLinkIsValid && (
					<a 
						ref={aRef}
						className="text-reset"
						href={directLink}
						tabIndex={1}
						download={typeof name === "string" ? name : true}
						onClick={async (evt) => {
							if (mechanism !== "built-in") return;
							evt.preventDefault();

							directDownloadFromUrl(
								evt.currentTarget.href,
								evt.currentTarget.download,
								(received, total) => {
									if (size !== total) setSize(total);
									setDownloaded(received);
								}
							).catch((err) => {
								if (err instanceof FetchError && err.code === 404) {
									setError("File is no longer available.");
								} else {
									window.open(directLink, "_blank");
								}
							});
						}}
					/>
				)}
			</>
		</Conditional>
	</>;
}

