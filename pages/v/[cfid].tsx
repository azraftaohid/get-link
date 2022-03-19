import { useAuthUser } from "@react-query-firebase/auth";
import { Days, formatDate } from "@thegoodcompany/common-utils-js";
import { getAuth } from "firebase/auth";
import { getDoc } from "firebase/firestore/lite";
import { deleteObject, getDownloadURL, getMetadata } from "firebase/storage";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage } from "next";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import React, { useEffect, useState } from "react";
import { AssurePrompt } from "../../components/AssurePrompt";
import { Button } from "../../components/Button";
import { CopyButton } from "../../components/CopyButton";
import { FileView } from "../../components/FileView";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Icon } from "../../components/Icon";
import { Loading } from "../../components/Loading";
import { Metadata } from "../../components/Meta";
import { PageContainer } from "../../components/PageContainer";
import { PageContent } from "../../components/PageContent";
import { DimensionField } from "../../models/dimension";
import { FileField, FileMetadata, getFileContentRef, getFileRef, getThumbnailContentRef, releaseFile } from "../../models/files";
import { UserSnapshotField } from "../../models/users";
import styles from "../../styles/cfid.module.scss";
import { notFound } from "../../utils/common";
import { createFileLink, FileCustomMetadata } from "../../utils/files";
import { mergeNames } from "../../utils/mergeNames";
import { formatSize } from "../../utils/strings";
import { useToast } from "../../utils/useToast";
import { StaticSnapshot, toStatic } from "../api/staticSnapshot";

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
}) => {
	const router = useRouter();
	const { makeToast } = useToast();

	const { data: user } = useAuthUser(["user"], getAuth());

	const [showDeletePromt, setShowDeletePrompt] = useState(false);
	const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | undefined>(tDataUrl || undefined);

	const [isDeleting, setDeleting] = useState(false);
	
	useEffect(() => {
		if (!thumbnailSmall) return;
		
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
		xhr.open("GET", thumbnailSmall);
		xhr.send();
	}, [thumbnailSmall]);
	
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
	const strCreateTime = createSeconds && formatDate(new Date(createSeconds * 1000), "short", "year", "month", "day");

	return <PageContainer>
		<Metadata 
			title="Get Link" 
			image={thumbnail || thumbnailSmall || (type.startsWith("image/") && directLink)} />
		<Header />
		<PageContent>
			<FileView 
				className={mergeNames(styles.fView, "mb-3")} 
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
						variant="outline-vivid"
						content={createFileLink(snapshot.id, true)}
						left={<Icon name="link" size="sm" />}
					>
						<span className="d-none d-md-inline">Share</span>
					</CopyButton>
					{user && snapshot.data?.[FileField.USER]?.[UserSnapshotField.UID] === user.uid && <Button
						className="ms-2"
						variant="outline-danger"
						left={<Icon name="delete" size="sm" />}
						onClick={() => setShowDeletePrompt(true)}
					>
						<span className="d-none d-md-inline">Delete</span>
					</Button>}
				</div>
				<p className="text-wrap">
					<small className="d-block text-muted">{formatSize(size)}</small>
					{strCreateTime}
				</p>
			</div>
			<AssurePrompt 
				title="File will be deleted permanently"
				message="Are you sure you want to delete this file. Once deleted, it can not be recovered."
				show={showDeletePromt} 
				confirmProps={{ state: isDeleting ? "loading" : "none" }}
				onConfirm={async () => {
					setDeleting(true);

					const fid = snapshot.data?.[FileField.FID];
					try {
						if (!fid) throw new Error(`fid is undefined [cfid: ${snapshot.id}]`);

						const contentRef = getFileContentRef(fid);
						await deleteObject(contentRef);
						await releaseFile(snapshot.id);
						
						router.push("/");
						setShowDeletePrompt(false);
						makeToast("File deleted successfully.", "info");
					} catch (error) {
						console.error(`error deleting file [cause: ${error}]`);
						makeToast("Darn, we couldn't delete the file. Please try again later or file a report below.", "error");
					}

					setDeleting(false);
				}}
				onCancel={() => {
					setShowDeletePrompt(false);
					setDeleting(false);
				}}
			/>
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
	const cfid = params?.cfid;
	if (typeof cfid !== "string") return notFound;

	const doc = getFileRef(cfid);
	const snapshot = await getDoc(doc);
	if (!snapshot.exists()) return notFound;

	const staticSnapshot = toStatic(snapshot);
	const fid = staticSnapshot.data?.[FileField.FID];
	if (!fid) return notFound;

	const ref = getFileContentRef(fid);
	const thumbnailRef = getThumbnailContentRef(fid, "1024x1024");
	const smThumbnailRef = getThumbnailContentRef(fid, "56x56");

	const getUrl = getDownloadURL(ref);
	const getMetas = getMetadata(ref).catch(err => suppressError(err, cfid, "metadata"));
	const getThumbnailUrl = getDownloadURL(thumbnailRef).catch(err => suppressError(err, cfid, "thumbnail"));
	const getSmThumbnailUrl = getDownloadURL(smThumbnailRef).catch(err => suppressError(err, cfid, "small thumbnail"));

	let downloadUrl: string;
	let name: string;
	let type: string | undefined;
	let size: number;
	let width: number | undefined;
	let height: number | undefined;
	try {
		downloadUrl = await getUrl;
		const metas = await getMetas;
		if (!metas) throw new Error(`object metadata get failed [cfid: ${cfid}]`);
		
		name = metas.name;
		type = metas.contentType || "application/octet-stream";
		size = metas.size;
		width = (metas.customMetadata as FileCustomMetadata)?.width;
		height = (metas.customMetadata as FileCustomMetadata)?.height;
	} catch (error: any) {
		if (error.code === "storage/object-not-found") return notFound;
		throw error;
	}

	const smThumbnailUrl = await getSmThumbnailUrl;
	const thumbailUrl = await getThumbnailUrl;

	return {
		notFound: false,
		revalidate: new Days(1).toSeconds().value,
		props: {
			name: name,
			type: type || "application/octet-stream",
			size: size,
			width: staticSnapshot.data?.[FileField.DIMENSION]?.[DimensionField.WIDTH] || width || null,
			height: staticSnapshot.data?.[FileField.DIMENSION]?.[DimensionField.HEIGHT] || height || null,
			directLink: downloadUrl,
			thumbnail: thumbailUrl || null,
			thumbnailSmall: smThumbnailUrl || null,
			snapshot: staticSnapshot,
		},
	};
};

export default View;

interface StaticProps {
	name: string,
	directLink: string,
	thumbnail?: string | null,
	thumbnailSmall?: string | null,
	type: string,
	size: number,
	width?: number | null,
	height?: number | null,
	snapshot: StaticSnapshot<FileMetadata>,
	thumbnailDataUrl?: string | null,
}

interface Segments extends ParsedUrlQuery {
	cfid: string,
}