import { getDocs } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import { FileField, getFileDocs } from "../models/files";
import { now } from "../utils/dates";
import { DownloadAsZipParams, downloadAsZip } from "../utils/downloads";
import { Falsy } from "../utils/falsy";
import { ProcessedFileData } from "../utils/useProcessedFiles";
import { Button } from "./Button";
import { Conditional } from "./Conditional";

enum State {
	NONE, PREPARING, DOWNLOADING, COMPLETED, FAILED,
}

const DownloadFilesDialog: React.FunctionComponent<DownloadFilesDialogProps> = ({
	lid,
	files,
	saveAsPrefix,
	downloadSize,
	onHide,
	...rest
}) => {
	const [state, setState] = useState(State.NONE);
	const [skips, setSkips] = useState<[string, string][]>([]);

	const reset = useRef(() => {
		setState(State.NONE);
		setSkips([]);
	});

	const handleHide = () => {
		onHide?.();
		reset.current();
	};

	useEffect(() => {
		if (!lid) return;

		setState(State.PREPARING);
		const getFileOptions = async (): Promise<DownloadAsZipParams["files"]> => {
			if (files) return files.map(file => ({ fileName: file.fid, downloadName: file.name }));

			const query = getFileDocs(lid);
			const snapshot = await getDocs(query);

			const fileOptions: DownloadAsZipParams["files"] = [];
			snapshot.forEach(result => {
				const data = result.data();
				const fid = data[FileField.FID];
				if (!fid) return console.warn("File FID not defined: " + result.id);

				fileOptions.push({ fileName: fid, downloadName: data[FileField.OVERRIDES]?.customMetadata?.name });
			});

			return fileOptions;
		};

		getFileOptions().then(fileOptions => {
			setState(State.DOWNLOADING);
			return downloadAsZip({
				files: fileOptions,
				saveAs: `${saveAsPrefix || now()}.zip`,
				size: downloadSize,
			});
		}).then(result => {
			setState(State.COMPLETED);
			setSkips(Object.entries(result.skipped));
		}).catch(error => {
			console.error("Download failed with error: ", error);
			setState(State.FAILED);
		});
	}, [downloadSize, files, lid, saveAsPrefix]);

	return <Modal
		backdrop={undefined}
		fullscreen="md-down"
		keyboard
		aria-label="download-dialog"
		onHide={handleHide}
		{...rest}
	>
		<ModalHeader>
			<ModalTitle>Downloading Files</ModalTitle>
		</ModalHeader>
		<ModalBody>
			<p>
				We&apos;re working diligently to gather all the files you need.
			</p>
			<Conditional in={state >= State.DOWNLOADING}>
				<p>Your download is underway. Please see your browser downloads for progress.</p>
			</Conditional>
			<Conditional in={state < State.COMPLETED}>
				<Alert className="mt-3" variant="secondary">
					Please keep this tab open and avoid switching to other sites until the download finishes.{" "}
					Closing the tab may interrupt the process and require you to restart.
				</Alert>
			</Conditional>
			<Conditional in={state === State.COMPLETED}>
				<Alert className="mt-3" variant="success">
					A zip file comprising {skips.length ? "" : "all "} your files has been downloaded.
				</Alert>
			</Conditional>
			<Conditional in={!!skips.length}>
				<Alert className="mt-3" variant="danger">
					We had trouble with the following files and are not included in the zip file:
					<ol>
						{skips.map(([fileName, cause]) => <li key={fileName} className="text-break">
							{fileName}: {cause}
						</li>)}
					</ol>
				</Alert>
			</Conditional>
			<Conditional in={state === State.FAILED}>
				<Alert className="mt-3" variant="danger">
					The download was interrupted and therefore canceled.
				</Alert>
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

export interface DownloadFilesDialogProps extends ModalProps {
	lid?: string | Falsy,
	files?: ProcessedFileData[] | Falsy,
	saveAsPrefix?: string,
	downloadSize?: number,
}
