import React, { useEffect, useRef, useState } from "react";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import ProgressBar from "react-bootstrap/ProgressBar";
import { DownloadLink, DownloadLinkField, requestArchive } from "../models/archive";
import { AbandonnedError } from "../utils/abandon";
import { quantityString } from "../utils/quantityString";
import { formatSize } from "../utils/strings";
import { useToast } from "../utils/useToast";
import { Button } from "./Button";
import { Conditional } from "./Conditional";
import Link from "./Link";
import { TextualProgress, TextualProgressProps } from "./progress/TextualProgress";

const stateVariantMapping: Record<State, TextualProgressProps["variant"]> = {
	"none": "muted",
	"preparing": "muted",
	"complete": "muted",
	"failed": "danger",
};

const stateTextMapping: Record<Exclude<State, "preparing">, string> = {
	"complete": "Completed",
	"failed": "Failed, please try again after some time.",
	"none": "Making request...",
};

const DownloadFilesDialog: React.FunctionComponent<DownloadFilesDialogProps> = ({
	lid,
	onHide,
	...rest
}) => {
	const { makeToast } = useToast();
	const [state, setState] = useState<State>("none");
	
	const [progress, setProgress] = useState<number>(0);
	const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>();

	const reset = useRef(() => {
		setState("none");
		setDownloadLinks(undefined);
		setProgress(0);
	});

	const handleHide = () => {
		onHide?.();
		reset.current();
	};

	useEffect(() => {
		if (!lid) return;
		setState("preparing");

		const [request, abandon] = requestArchive(lid, setProgress);
		request.then(value => {
			setState("complete");

			setDownloadLinks(value.links);
			if (value.skips?.length) {
				makeToast("We had trouble with the following files and are not included in the result:\n"
					+ `${value.skips.join("\n")}`, "error");
			}
		}).catch(err => {
			if (err instanceof AbandonnedError) {
				console.log("Archive request abandoned.");
				reset.current();
				return;
			}

			console.error("Prepare failed with error: " + err);
			setState("failed");
		});

		return abandon;
	}, [lid, makeToast]);

	return <Modal
		backdrop={undefined}
		fullscreen="md-down"
		keyboard
		aria-label="download-dialog"
		onHide={handleHide}
		{...rest}
	>
		<ModalHeader>
			<ModalTitle>Download Files</ModalTitle>
		</ModalHeader>
		<ModalBody>
			<p>Your files are being prepared for download.</p>
			<ProgressBar now={progress}></ProgressBar>
			<TextualProgress variant={stateVariantMapping[state]}>
				{state === "preparing" ? `${progress}% completed.` : stateTextMapping[state]}
			</TextualProgress>
			<Conditional in={state === "complete"}>
				<hr />
				<p>The following {quantityString("link", "links", downloadLinks?.length || 0)} comprises all your files.{" "}
				Click on their names to start the download:</p>
				{!downloadLinks?.length ? "No links found." : <ol>{downloadLinks.map(({
					[DownloadLinkField.NAME]: name = "unnamed",
					[DownloadLinkField.URL]: url,
					[DownloadLinkField.SIZE]: size
				}) => <li key={url}>
					<Link key={url} href={url || "#"} newTab download={name}>
						{name}
					</Link>
					{typeof size === "number" ? ` (${formatSize(size)})` : ""}
				</li>)}</ol>}
			</Conditional>
		</ModalBody>
		<ModalFooter>
			<Button variant="outline-secondary" onClick={handleHide}>
				Dismiss
			</Button>
		</ModalFooter>
	</Modal>;
};

export default DownloadFilesDialog;

type State = "none" | "preparing" | "complete" | "failed";

export interface DownloadFilesDialogProps extends ModalProps {
	lid?: string,
}
