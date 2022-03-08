import { Days, formatDate } from "@thegoodcompany/common-utils-js";
import { getDoc } from "firebase/firestore";
import { getDownloadURL, getMetadata } from "firebase/storage";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import React, { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { CopyButton } from "../../components/CopyButton";
import { FileView } from "../../components/FileView";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { Loading } from "../../components/Loading";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { FileField, FileMetadata, getFileContentRef, getFileRef, getThumbnailContentRef } from "../../models/files";
import { notFound } from "../../utils/common";
import { createFileLink, FileCustomMetadata } from "../../utils/files";
import { useToast } from "../../utils/useToast";
import { StaticSnapshot, toStatic } from "../api/staticSnapshot";

const View: NextPage<InferGetStaticPropsType<typeof getStaticProps>> = ({ 
	snapshot, 
	name, 
	directLink, 
	thumbnail, 
	type, 
	size, 
	width, 
	height,
	thumbnailDataUrl: tDataUrl,
}) => {
	const { makeToast } = useToast();
	const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | undefined>(tDataUrl || undefined);
	
	useEffect(() => {
		if (!thumbnail) return;
		
		console.debug("loading thumbnail");
		const xhr = new XMLHttpRequest();
		xhr.onload = () => {
			console.debug("thumbnail blob received");
			const blob = xhr.response;

			const reader = new FileReader();
			reader.onloadend = () => {
				console.debug("thumbnail data url loaded");
				const result = reader.result;
				if (typeof result !== "string") setThumbnailDataUrl(undefined);
				else setThumbnailDataUrl(result);
			};

			reader.onerror = () => {
				console.warn(`thumbnail data url load failed [status: ${xhr.status}]`);
			};

			reader.readAsDataURL(blob);
		};

		xhr.onerror = () => {
			console.error("error getting thumbnail");
		};

		xhr.responseType = "blob";
		xhr.open("GET", thumbnail);
		xhr.send();
	}, [thumbnail]);
	
	if (!directLink) {
		return <PageContainer>
			<Header />
			<PageContent>
				<Loading />
			</PageContent>
			<Footer />
		</PageContainer>;
	}

	const createSeconds = snapshot.data?.[FileField.CREATE_TIME]?.seconds;

	return <PageContainer>
		<Header />
		<PageContent>
			<FileView 
				className="mb-3" 
				src={directLink} 
				placeholderDataUrl={thumbnailDataUrl} 
				size={size} 
				type={type} 
				width={width} 
				height={height} />
			<div>
				<div className="float-end d-flex flex-row ps-2">
					<Button 
						className="me-2"
						variant="outline-vivid" 
						href={directLink} 
						target="_blank" 
						download={name} 
						left={<Icon name="file_download" size="sm" />}
					>
						<span className="d-none d-md-inline">Download</span>
					</Button>
					<CopyButton
						className="me-2"
						variant="outline-vivid"
						content={createFileLink(snapshot.id, true)}
						left={<Icon name="link" size="sm" />}
					>
						<span className="d-none d-md-inline">Share</span>
					</CopyButton>
					<Button
						className="me-2"
						variant="outline-vivid"
						left={<Icon name="report" size="sm" />}
						onClick={() => makeToast("Feature not implemented yet!", "warning")}
					>
						<span className="d-none d-md-inline">Report</span>
					</Button>
				</div>
				{createSeconds && <p className="text-wrap"><span className="text-muted">Created</span>{" "}
					{formatDate(new Date(createSeconds * 1000), "short", "year", "month", "day")}</p>}
			</div>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		fallback: true,
		paths: [],
	};
};

export const getStaticProps: GetStaticProps<StaticProps, Segments> = async ({ params }) => {
	const id = params?.id;
	if (typeof id !== "string") return notFound;

	const doc = getFileRef(id);
	const snapshot = await getDoc(doc);
	if (!snapshot.exists()) return notFound;

	const staticSnapshot = toStatic(snapshot);
	const fid = staticSnapshot.data?.[FileField.FID];
	if (!fid) return notFound;

	const ref = getFileContentRef(fid);
	const thumbnailRef = getThumbnailContentRef(fid, "56x56");

	const getUrl = getDownloadURL(ref);
	const getThumbnailUrl = getDownloadURL(thumbnailRef);
	const getMetas = getMetadata(ref);

	let downloadUrl: string;
	let name: string;
	let type: string | undefined;
	let size: number;
	let width: number | undefined;
	let height: number | undefined;
	try {
		const metas = await getMetas;
		downloadUrl = await getUrl;
		name = metas.name;
		type = metas.contentType || "application/octet-stream";
		size = metas.size;
		width = (metas.customMetadata as FileCustomMetadata)?.width;
		height = (metas.customMetadata as FileCustomMetadata)?.height;
	} catch (error: any) {
		if (error.code === "storage/object-not-found") return notFound;
		throw error;
	}

	let thumbnailUrl: string | undefined;
	try {
		thumbnailUrl = await getThumbnailUrl;
	} catch (error: any) {
		if (error.code === "storage/object-not-found") {
			console.warn(`thumbnail not generated [id: ${id}]`);
		} else {
			console.error(`error getting thumbnail [id: ${id}]`);
		}
	}

	return {
		notFound: false,
		revalidate: new Days(30).toSeconds().value,
		props: {
			name: name,
			type: type || "application/octet-stream",
			size: size,
			width: width || null,
			height: height || null,
			directLink: downloadUrl,
			thumbnail: thumbnailUrl || null,
			snapshot: staticSnapshot,
		},
	};
};

export default View;

interface StaticProps {
	name: string,
	directLink: string,
	thumbnail?: string | null,
	type: string,
	size: number,
	width?: number | null,
	height?: number | null,
	snapshot: StaticSnapshot<FileMetadata>,
	thumbnailDataUrl?: string | null,
}

interface Segments extends ParsedUrlQuery {
	id: string,
}