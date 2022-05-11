import { useAuthUser } from "@react-query-firebase/auth";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { getAuth } from "firebase/auth";
import { collection, FieldPath, getFirestore, limit, orderBy, Query, query, QueryDocumentSnapshot, startAfter, where } from "firebase/firestore";
import { getDownloadURL, getMetadata } from "firebase/storage";
import { NextPage } from "next";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Loading } from "../components/Loading";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { ShortLoading } from "../components/ShortLoading";
import { getFileRef, getThumbnailRef } from "../models/files";
import { COLLECTION_LINKS, LinkData, LinkField } from "../models/links";
import { UserSnapshotField } from "../models/users";
import styles from "../styles/dashboard.module.scss";
import { hasExpired } from "../utils/dates";
import { initFirestore } from "../utils/firestore";
import { mergeNames } from "../utils/mergeNames";
import { createAbsoluteUrl, createUrl, DOMAIN } from "../utils/urls";
import { getSolidStallImage } from "../visuals/stallData";

const FETCH_LIMIT = 12;

const icMapping: Record<string, string> = {
	"text": "text_snippet",
	"video": "video_file",
	"audio": "audio_file",
};

const NoPreview: React.FunctionComponent<React.PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { icon?: string }>> = ({ 
	className,
	icon = "description",
	...rest
}) => {
	return <div className={mergeNames(styles.noPreview, "d-flex flex-column align-items-center justify-content-center text-muted", className)} {...rest}>
		<Icon name={icon} size="lg" />
		<p className="fs-5">Preview unavailable!</p>
	</div>;
};

const LoadingPreview: React.FunctionComponent<React.PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>> = ({
	className,
	...rest
}) => {
	return <div className={mergeNames(styles.loadingPreview, className)} {...rest}>
		<ShortLoading />
	</div>;
};

const FileCard: React.FunctionComponent<React.PropsWithChildren<{ file: QueryDocumentSnapshot<LinkData> }>> = ({ file }) => {
	const [thumbnail, setThumbnail] = useState<string | null>();
	const [ic, setIc] = useState<string>();

	const data = file.data({ serverTimestamps: "estimate" });
	const fid = data[LinkField.FID];
	const createTime = data[LinkField.CREATE_TIME];
	const expireTime = data[LinkField.EXPIRE_TIME];

	useEffect(() => {
		if (!fid) {
			setThumbnail(null);
			return;
		}
		setThumbnail(undefined);

		const thumbRef = getThumbnailRef(fid, "384x384");
		getDownloadURL(thumbRef).then(url => setThumbnail(url)).catch(async err => {
			console.warn(`thumbnail not available: ${err}`);

			const fileRef = getFileRef(fid);
			try {
				const metadata = await getMetadata(fileRef);
				const prefix = metadata.contentType?.split("/")?.[0];

				if (prefix !== "image") {
					if (prefix) setIc(icMapping[prefix]);
					throw new Error("content is not of type image");
				}

				const directLink = await getDownloadURL(fileRef);
				setThumbnail(directLink);
			} catch (error) {
				console.debug(`direct download file failed: ${error}`);
				setThumbnail(null);	
			}
		});
	}, [fid]);

	return <Card className={mergeNames(styles.fileCard, "border-feedback")}>
		<Card.Header>
			<Link className="stretched-link text-decoration-none text-reset" href={createUrl("v", file.id)}>
				<span className="d-block text-truncate">{data[LinkField.TITLE] || data[LinkField.NAME] || file.id}</span>
			</Link>
		</Card.Header>
		<div className={mergeNames(styles.linkPreview)}>
			{thumbnail 
				? <Image 
					className="card-img-top" 
					placeholder="blur"
					src={thumbnail} 
					alt="link preview" 
					objectFit="cover"
					layout="fill"
					sizes="50vw"
					quality={50}
					blurDataURL={getSolidStallImage()} /> 
				: thumbnail === null 
				? <NoPreview icon={ic} />
				: <LoadingPreview />}
		</div>
		<Card.Footer className="d-flex flex-row align-items-center">
			<span className="d-block text-muted text-truncate">
				{createTime && formatDate(createTime.toDate(), "short", "year", "month", "day")}
				{hasExpired(expireTime, createTime) && <> (<em>expired</em>)</>}
			</span>
			<CopyButton 
				className={mergeNames(styles.btnShare, "ms-auto")}
				variant="outline-secondary"
				content={createAbsoluteUrl(DOMAIN, "v", file.id)} 
				left={<Icon name="link" size="sm" />} 
			/>
		</Card.Footer>
	</Card>;
};

const FileConcat: React.FunctionComponent<React.PropsWithChildren<{ snapshot: QueryDocumentSnapshot<LinkData>[] }>> = ({ snapshot }) => {
	return <>
		{snapshot.map(file => <Col key={`col-${file.id}`}><FileCard file={file} /></Col>)}
	</>;
};

const EmptyView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return <Alert>
		<Alert.Heading>No upload history!</Alert.Heading>
		Upload your first file <Link variant="alert" href="/">here</Link> then comeback.
	</Alert>;
};

const ErrorView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return <Alert variant="danger">
		<Alert.Heading>Something went wrong!</Alert.Heading>
		We couldn&apos;t fetch display you the data you&apos;re looking for. Please try again later, or if this issue 
		persist, file a report.
	</Alert>;
};

const UserDashboard: React.FunctionComponent<React.PropsWithChildren<{ uid: string }>> = ({ uid }) => {
	const baseQuery: Query<LinkData> = useMemo(() => {
		const db = getFirestore();
		return query(collection(db, COLLECTION_LINKS), 
			where(new FieldPath(LinkField.USER, UserSnapshotField.UID), "==", uid),
			orderBy(LinkField.CREATE_TIME, "desc"),
			limit(FETCH_LIMIT));
	}, [uid]);

	const links = useFirestoreInfiniteQuery(uid, baseQuery, (snapshot) => {
		if (snapshot.size === 0 || snapshot.size % FETCH_LIMIT > 0) return undefined;

		const endDoc = snapshot.docs[snapshot.size - 1];
		return query(baseQuery, startAfter(endDoc));
	});

	if (!links.data?.pages[0]?.size) {
		if (links.isLoading || links.isFetching) return <Loading />;
		if (links.isError) {
			console.error(`fetch error: ${links.error}`);
			return <ErrorView />;
		}

		return <EmptyView />;
	}

	return <div>
		<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
			{links.data.pages.map((page, i) => <FileConcat key={`page-${i}`} snapshot={page.docs}/>)}
		</Row>
		<Row className="mt-4">
			<Col className="mx-auto" md={5}>
				<Button 
					className="w-100 justify-content-center"
					variant="outline-secondary"
					state={(links.isLoading || links.isFetching) ? "loading" : "none"} 
					onClick={() => links.fetchNextPage()} 
					disabled={!links.hasNextPage || !links.isSuccess}
				>
					{links.hasNextPage ? "Load more" : "End"}
				</Button>
			</Col>
		</Row>
	</div>;
};

const Dashboard: NextPage = () => {
	initFirestore();
	const { data: user, isLoading } = useAuthUser(["user"], getAuth());

	return <PageContainer>
		<Metadata 
			title="Dashboard - Get Link" 
			description="See your upload history and more."
		/>
		<Header />
		<PageContent>
			<h1 className="mb-4">Recent files</h1>
			{user?.uid ? <UserDashboard uid={user.uid} /> : isLoading ? <Loading /> : <EmptyView />}
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Dashboard;