import { ParsedUrlQuery } from "querystring";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { compartCFK, createFID, deleteFile, FileKeyComponents, getThumbnailKey } from "../../models/files";
import { notFound } from "../../utils/common";
import { makeProcessedFile, ProcessedFileData } from "../../utils/useProcessedFiles";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { Loading } from "../../components/Loading";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Metadata } from "../../components/Meta";
import { getDownloadURL, requireObject } from "../../utils/storage";
import { NotFound } from "../../utils/errors/NotFound";
import { whenTruthy } from "../../utils/objects";
import { findFileIcon } from "../../utils/files";
import { FileCard } from "../../components/cards/FileCard";
import { ViewHeader } from "../../components/ViewHeader";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { formatSize } from "../../utils/strings";
import { CopyButton } from "../../components/CopyButton";
import { createAbsoluteUrl, DOMAIN } from "../../utils/urls";
import { Icon } from "../../components/Icon";
import { ClickEventContext, logClick } from "../../utils/analytics";
import { useUser } from "../../utils/useUser";
import React, { useState } from "react";
import { Button } from "../../components/Button";
import { AssurePrompt } from "../../components/AssurePrompt";
import { useRouter } from "next/router";
import { useToast } from "../../utils/useToast";
import Accordion from "react-bootstrap/Accordion";
import { AccordionHeader, AccordionItem } from "react-bootstrap";
import AccordionBody from "react-bootstrap/AccordionBody";
import { RecentListPlaceholder } from "../../components/list/RecentListPlaceholder";
import { Backlinks } from "../../components/list/Backlinks";
import Alert from "react-bootstrap/Alert";

function suppressError(error: unknown, cfk: string, subject: string) {
	if (error instanceof NotFound) console.warn(`${subject} not found [cfid: ${cfk}]`);
	else console.error(`Error getting ${subject} [cfid: ${cfk}]: `, error);
	return undefined;
}

const EmptyBacklinks: React.FunctionComponent = () => {
	return (
		<Alert>
			<Alert.Heading>No backlinks found!</Alert.Heading>
			This can happen when the file is uploaded but link creation is not completed yet or
			the link creation process was dismissed abruptly.
		</Alert>
	);
};

const BacklinksError: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert variant="danger">
			<Alert.Heading>Something went wrong!</Alert.Heading>
			We couldn&apos;t display you the data you&apos;re looking for. Please try again later, or if this
			issue persist, file a report.
		</Alert>
	);
};

const FileView: NextPage<Partial<StaticProps>> = ({
		cfk,
		fileKeyComponents,
		fileKey,
		name,
		directLink,
		thumbnail,
		size,
		type,
		height,
		width,
		uploadTimestamp,
}) => {
	const router = useRouter();
	const { makeToast } = useToast();
	const { user } = useUser();

	const [isDeleting, setDeleting] = useState(false);
	const [showDeletePrompt, setShowDeletePrompt] = useState(false);
	const [showBacklinks, setShowBacklinks] = useState(false);

	if (!cfk || !fileKey || !fileKeyComponents || !directLink || !type || typeof size !== "number") {
		return <PageContainer>
			<Header />
			<PageContent>
				<Loading />
			</PageContent>
			<Footer />
		</PageContainer>;
	}

	const isUser = fileKeyComponents.uid === user?.uid;

	return <PageContainer>
		<Metadata
			title={name || fileKey}
			image={whenTruthy(thumbnail || (type.startsWith("image/") && directLink),
				url => `/_next/image?url=${url}&w=1200&q=75`) || findFileIcon(type)}
		/>
		<Header />
		<PageContent>
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
							? <Backlinks fid={fileKey} emptyView={() => <EmptyBacklinks />} errorView={() => <BacklinksError />} />
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
		</PageContent>
		<Footer />
	</PageContainer>;
};

export const getStaticPaths: GetStaticPaths = async () => {
	return { fallback: true, paths: [] };
};

export const getStaticProps: GetStaticProps<StaticProps, Segments> = async ({ params }) => {
	const cfk = params?.cfk;
	if (typeof cfk !== "string") return notFound;

	const tasks: Promise<unknown>[] = [];
	const components = compartCFK(cfk);
	const fileKey = createFID(components.displayName + components.ext, components.uid);

	const thumbnailKey = getThumbnailKey(fileKey);
	const thumbnailPromise = requireObject(thumbnailKey)
		.then(() => getDownloadURL(thumbnailKey))
		.catch(err => suppressError(err, cfk, "thumbnail"));
	tasks.push(thumbnailPromise);

	let processed: ProcessedFileData;
	try {
		processed = await makeProcessedFile(fileKey);
	} catch (error) {
		if (error instanceof NotFound) return notFound;
		throw error;
	}
	(Object.keys(processed) as (keyof ProcessedFileData)[]).forEach(key => processed[key] === undefined && delete processed[key]);

	await Promise.all(tasks);
	
	return {
		notFound: false,
		props: {
			cfk, fileKey,
			fileKeyComponents: components,
			thumbnail: (await thumbnailPromise) || null,
			...processed,
		},
	};
};

export default FileView;

interface StaticProps extends ProcessedFileData {
	cfk: string,
	fileKey: string,
	fileKeyComponents: FileKeyComponents,
	thumbnail: string | null | undefined,
}

interface Segments extends ParsedUrlQuery {
	cfk: string;
}
