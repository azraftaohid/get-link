import { useAuthUser } from "@react-query-firebase/auth";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { getAuth } from "firebase/auth";
import { collection, FieldPath, getFirestore, limit, orderBy, Query, query, QueryDocumentSnapshot, startAfter, where } from "firebase/firestore";
import { getDownloadURL } from "firebase/storage";
import { NextPage } from "next";
import React, { useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import CardImg from "react-bootstrap/CardImg";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { COLLECTION_FILES, FileField, FileMetadata, getThumbnailContentRef } from "../models/files";
import { UserSnapshotField } from "../models/users";
import styles from "../styles/dashboard.module.scss";
import { initFirestore } from "../utils/firestore";
import { mergeNames } from "../utils/mergeNames";
import { createAbsoluteUrl, createUrl, DOMAIN } from "../utils/urls";

const FETCH_LIMIT = 6;

const NoPreview: React.FunctionComponent<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { data: FileMetadata }> = ({ 
	className,
	data,
	...rest
}) => {
	return <div className={mergeNames(styles.noPreview, "text-center", className)} {...rest}>
		<p className="fs-5">Preview not available</p>
	</div>;
};

const Loading: React.FunctionComponent<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
	className,
	...rest
}) => {
	return <div className={mergeNames("text-center", className)} {...rest}>
		<p className="fs-5">Loading...</p>
	</div>;
};

const FileCard: React.FunctionComponent<{ file: QueryDocumentSnapshot<FileMetadata> }> = ({ file }) => {
	const [thumbnail, setThumbnail] = useState<string | null>();

	const data = file.data({ serverTimestamps: "estimate" });
	const fid = data[FileField.FID];
	const createTime = data[FileField.CREATE_TIME]?.toDate();

	useEffect(() => {
		if (!fid) {
			setThumbnail(null);
			return;
		}
		setThumbnail(undefined);

		const ref = getThumbnailContentRef(fid, "384x384");
		getDownloadURL(ref).then(url => setThumbnail(url)).catch(err => {
			console.warn(`thumbnail not available: ${err}`);
			setThumbnail(null);
		});
	}, [fid]);

	return <Card key={file.id}>
		<div className={mergeNames(styles.linkPreview)}>
			{thumbnail 
				? <CardImg src={thumbnail} alt="link preview" /> 
				: thumbnail === null 
				? <NoPreview className="pt-5" data={data} />
				: <Loading className="pt-5" />}
		</div>
		<Card.Footer className="d-flex flex-row">
			<div className="w-75 me-auto">
				<Link className="stretched-link text-decoration-none link-secondary" href={createUrl("v", file.id)}>
					<strong className="d-block text-truncate">{data[FileField.NAME] || file.id}</strong>
				</Link>
				{createTime && formatDate(createTime, "short", "year", "month", "day")}
			</div>
			<CopyButton 
				className={styles.btnShare}
				variant="outline-secondary"
				content={createAbsoluteUrl(DOMAIN, "v", file.id)} 
				left={<Icon name="link" size="sm" />} 
			/>
		</Card.Footer>
	</Card>;
};

const FileConcat: React.FunctionComponent<{ snapshot: QueryDocumentSnapshot<FileMetadata>[] }> = ({ snapshot }) => {
	return <>
		{snapshot.map(file => <Col key={`key-${file.id}`}><FileCard file={file} /></Col>)}
	</>;
};

const Empty: React.FunctionComponent = () => {
	return <Alert>
		<Alert.Heading>No upload history!</Alert.Heading>
		Upload your first file <Link variant="alert" href="/">here</Link> then comeback.
	</Alert>;
};

const Error: React.FunctionComponent = () => {
	return <Alert variant="danger">
		<Alert.Heading>Something went wrong!</Alert.Heading>
		We couldn&apos;t fetch display you the data you&apos;re looking for. Please try again later, or if this issue 
		persist, file a report.
	</Alert>;
};

const UserDashboard: React.FunctionComponent<{ uid: string }> = ({ uid }) => {
	const baseQuery: Query<FileMetadata> = useMemo(() => {
		const db = getFirestore();
		return query(collection(db, COLLECTION_FILES), 
			where(new FieldPath(FileField.USER, UserSnapshotField.UID), "==", uid),
			orderBy(FileField.CREATE_TIME, "desc"),
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
			return <Error />;
		}

		return <Empty />;
	}

	return <div>
		<Row className="g-4" xs={1} md={2} lg={3}>
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
					Load more
				</Button>
			</Col>
		</Row>
	</div>;
};

const Dashboard: NextPage = () => {
	initFirestore();
	const { data: user } = useAuthUser(["user"], getAuth());

	return <PageContainer>
		<Metadata 
			title="Dashboard - Get Link" 
			description="See your upload history and more."
		/>
		<Header />
		<PageContent>
			{user?.uid ? <UserDashboard uid={user.uid} /> : <Empty />}
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default Dashboard;