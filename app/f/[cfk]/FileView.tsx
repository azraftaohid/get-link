"use client";

import { AssurePrompt } from "@/components/AssurePrompt";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { ViewHeader } from "@/components/ViewHeader";
import { FileCard } from "@/components/cards/FileCard";
import { Backlinks } from "@/components/list/Backlinks";
import { RecentListPlaceholder } from "@/components/list/RecentListPlaceholder";
import { FileKeyComponents, deleteFile } from "@/models/files";
import { ClickEventContext, logClick } from "@/utils/analytics";
import { shouldStepOutDownload } from "@/utils/downloads";
import { ProcessedFileData } from "@/utils/processedFiles";
import { formatSize } from "@/utils/strings";
import { DOMAIN, createAbsoluteUrl } from "@/utils/urls";
import { useToast } from "@/utils/useToast";
import { useUser } from "@/utils/useUser";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import AccordionBody from "react-bootstrap/AccordionBody";
import AccordionHeader from "react-bootstrap/AccordionHeader";
import AccordionItem from "react-bootstrap/AccordionItem";
import { BacklinksError, EmptyBacklinks } from "./helperComponents";

export default function FileView({
	cfk,
	fileKeyComponents,
	fileKey,
	name,
	directLink,
	size,
	type,
	height,
	width,
	uploadTimestamp,
}: Readonly<FileViewProps>) {
	const router = useRouter();
	const { makeToast } = useToast();
	const { user } = useUser();

	const [isDeleting, setDeleting] = useState(false);
	const [showDeletePrompt, setShowDeletePrompt] = useState(false);
	const [showBacklinks, setShowBacklinks] = useState(false);
	const [stepOutDownload, setStepOutDownload] = useState(false);

	useEffect(() => {
		setStepOutDownload(shouldStepOutDownload());
	}, []);

	const isUser = user && user.uid === fileKeyComponents.uid;

	return <>
		<ViewHeader
			primaryText={name || "Unnamed"}
			secondaryText={uploadTimestamp ? formatDate(new Date(uploadTimestamp), "short", "day", "month", "year") : "Time unknown"}
			tertiaryText={formatSize(size)}
			actions={<>
				<CopyButton
					variant="outline-vivid"
					content={createAbsoluteUrl(DOMAIN, "f", cfk)}
					left={<Icon name="link" size="sm" />}
					onClick={() => logClick("share")}
				>
					Share
				</CopyButton>
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
		<FileCard
			directLink={directLink}
			name={name}
			type={type}
			width={width}
			height={height}
			size={size}
			fileCount={1}
			isOwner={isUser}
			stepOutDownload={stepOutDownload}
		/>
		{isUser && <Accordion
			className={"mt-3"}
			onSelect={(evtKey) => {
				// backlinks are fetched on first time it is selected
				if (evtKey === "backlinks") return setShowBacklinks(true);
			}}
		>
			<AccordionItem eventKey={"backlinks"}>
				<AccordionHeader>Backlinks</AccordionHeader>
				<AccordionBody>
					{showBacklinks
						? <Backlinks uid={user?.uid || ""} fid={fileKey} emptyView={() => <EmptyBacklinks />} errorView={() => <BacklinksError />} />
						: <RecentListPlaceholder limit={3} />}
				</AccordionBody>
			</AccordionItem>
		</Accordion>}
		<AssurePrompt
			title={"File will be deleted permanently, including from backlinks"}
			message={"Are you sure you want to delete this file? This can not be undone!"}
			show={showDeletePrompt}
			confirmProps={{ state: isDeleting ? "loading" : "none" }}
			onConfirm={async () => {
				setDeleting(true);

				const clickCtx: ClickEventContext = {};
				try {
					await deleteFile(fileKey);

					router.push("/");
					setShowDeletePrompt(false);
					makeToast("File deleted successfully. It may take several minutes for updates to propagate.", "info");
					clickCtx.status = "succeed";
				} catch (error) {
					console.error("Error deleting file: ", error);
					makeToast(
						"Darn, we couldn't delete the file. Please try again later or file a report below.",
						"error"
					);
					clickCtx.status = "failed";
				}

				setDeleting(false);
				logClick("delete_file", clickCtx);
			}}
			onCancel={() => {
				setShowDeletePrompt(false);
				setDeleting(false);

				const clickCtx: ClickEventContext = { status: "canceled" };
				logClick("delete_file", clickCtx);
			}}
		/>
	</>;
}

export interface FileViewProps extends ProcessedFileData {
	cfk: string,
	fileKey: string,
	fileKeyComponents: FileKeyComponents,
	thumbnail: string | null | undefined,
}
