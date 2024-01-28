import { useAuthUser } from "@react-query-firebase/auth";
import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import { getAuth } from "firebase/auth";
import {
	collection,
	FieldPath,
	getFirestore,
	limit,
	orderBy,
	Query,
	query,
	QueryDocumentSnapshot,
	startAfter,
	where,
} from "firebase/firestore";
import { NextPage } from "next";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Placeholder from "react-bootstrap/Placeholder";
import Row from "react-bootstrap/Row";
import { Button } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { ExpandButton } from "../components/ExpandButton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { Shimmer } from "../components/Shimmer";
import { ShortLoading } from "../components/ShortLoading";
import { getFileKey, getThumbnailKey } from "../models/files";
import { COLLECTION_LINKS, LinkData, LinkField } from "../models/links";
import { UserSnapshotField } from "../models/users";
import styles from "../styles/dashboard.module.scss";
import { logClick } from "../utils/analytics";
import { hasExpired } from "../utils/dates";
import { NotFound } from "../utils/errors/NotFound";
import { findFileIcon, NON_PREVIEW_SUPPORTING_TYPE } from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { getDownloadURL, getMetadata, requireObject } from "../utils/storage";
import { createAbsoluteUrl, createUrl, DOMAIN } from "../utils/urls";
import { getSolidStallImage } from "../visuals/stallData";

const FETCH_LIMIT = 12;

const NoPreview: React.FunctionComponent<
	React.PropsWithChildren<
		React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { icon?: string }
	>
> = ({ className, icon = "description", ...rest }) => {
	return (
		<div
			className={mergeNames(
				styles.noPreview,
				"d-flex flex-column align-items-center justify-content-center text-muted",
				className
			)}
			{...rest}
		>
			<Icon name={icon} size="lg" />
			<p className="fs-5">Preview unavailable!</p>
		</div>
	);
};

const LoadingPreview: React.FunctionComponent<
	React.PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>
> = ({ className, ...rest }) => {
	return (
		<div className={mergeNames(styles.loadingPreview, className)} {...rest}>
			<ShortLoading />
		</div>
	);
};

const LinkListPlaceholder: React.FunctionComponent = () => {
	return (
		<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
			<LinkPlaceholderConcat />
		</Row>
	);
};

const LinkCardPlaceholder: React.FunctionComponent = () => {
	return (
		<Card className={mergeNames(styles.linkCard, "border-feedback")}>
			<Card.Header>
				<Link className="stretched-link text-decoration-none text-reset" href="#">
					<Shimmer className="w-100 py-1" xs={1} pattern={<Placeholder className="w-75" />} size="lg" />
				</Link>
			</Card.Header>
			<div className={mergeNames(styles.linkPreview)}>
				<div className={styles.cardImg} />
			</div>
			<Card.Footer className="d-flex flex-row align-items-center">
				<span className="d-block text-muted text-truncate w-50">
					<Shimmer className="w-100 py-1" pattern={<Placeholder className="w-100" />} size="lg" />
				</span>
				<Button
					className={mergeNames(styles.btnShare, "ms-auto")}
					variant="outline-secondary"
					left={<Icon name="" size="sm" />}
					disabled
				/>
			</Card.Footer>
		</Card>
	);
};

const LinkCard: React.FunctionComponent<React.PropsWithChildren<{ link: QueryDocumentSnapshot<LinkData> }>> = ({
	link,
}) => {
	const [thumbnail, setThumbnail] = useState<string | null>();

	const data = link.data({ serverTimestamps: "estimate" });
	const title = data[LinkField.TITLE];
	const cover = data[LinkField.COVER];
	const createTime = data[LinkField.CREATE_TIME];
	const expireTime = data[LinkField.EXPIRE_TIME];

	useEffect(() => {
		const fid = cover?.fid;
		if (!fid) {
			setThumbnail(null);
			return;
		}
		setThumbnail(undefined);

		const thumbKey = getThumbnailKey(fid, "384x384");
		requireObject(thumbKey)
			.then(() => setThumbnail(getDownloadURL(thumbKey)))
			.catch(async (err) => {
				if (err instanceof NotFound) console.warn(`thumbnail get failed: ${err}`);

				const fileKey = getFileKey(fid);
				try {
					const metadata = await getMetadata(fileKey);
					const mimeType = metadata.mimeType;

					if (mimeType?.startsWith("image/") && !NON_PREVIEW_SUPPORTING_TYPE.includes(mimeType)) {
						const directLink = getDownloadURL(fileKey);
						setThumbnail(directLink);
					} else {
						setThumbnail(mimeType && findFileIcon(mimeType) || null);
					}
				} catch (error) {
					console.error(`direct download link get failed: ${error}`);
					setThumbnail(null);
				}
			});
	}, [cover?.fid]);

	return (
		<Card className={mergeNames(styles.linkCard, "border-feedback")}>
			<Card.Header>
				<Link className="stretched-link text-decoration-none text-reset" href={createUrl("v", link.id)}>
					<span className="d-block text-truncate">
						{title || link.id}
					</span>
				</Link>
			</Card.Header>
			<div className={mergeNames(styles.linkPreview)}>
				{thumbnail ? (
					<Image
						className={mergeNames("card-img-top", styles.cardImg)}
						placeholder="blur"
						src={thumbnail}
						alt="link preview"
						objectFit="cover"
						layout="fill"
						sizes="50vw"
						quality={50}
						blurDataURL={getSolidStallImage()}
						onError={() => setThumbnail(null)}
					/>
				) : thumbnail === null ? (
					<NoPreview />
				) : (
					<LoadingPreview />
				)}
			</div>
			<Card.Footer className="d-flex flex-row align-items-center">
				<span className="d-block text-muted text-truncate">
					{createTime && formatDate(createTime.toDate(), "short", "year", "month", "day")}
					{hasExpired(expireTime, createTime) && (
						<>
							{" "}
							(<em>expired</em>)
						</>
					)}
				</span>
				<CopyButton
					className={mergeNames(styles.btnShare, "ms-auto")}
					variant="outline-secondary"
					content={createAbsoluteUrl(DOMAIN, "v", link.id)}
					left={<Icon name="link" size="sm" />}
					onClick={() => logClick("share_file_card")}
				/>
			</Card.Footer>
		</Card>
	);
};

const LinkPlaceholderConcat: React.FunctionComponent = () => {
	return (
		<>
			{new Array(FETCH_LIMIT).fill(null).map((_v, i) => (
				<Col key={`col-${i}`}>
					<LinkCardPlaceholder />
				</Col>
			))}
		</>
	);
};

const LinkConcat: React.FunctionComponent<React.PropsWithChildren<{ snapshot: QueryDocumentSnapshot<LinkData>[] }>> = ({
	snapshot,
}) => {
	return (
		<>
			{snapshot.map((file) => (
				<Col key={`col-${file.id}`}>
					<LinkCard link={file} />
				</Col>
			))}
		</>
	);
};

const EmptyView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert>
			<Alert.Heading>No links generated yet!</Alert.Heading>
			Upload your first file{" "}
			<Link variant="alert" href="/">
				here
			</Link>{" "}
			then comeback.
		</Alert>
	);
};

const ErrorView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert variant="danger">
			<Alert.Heading>Something went wrong!</Alert.Heading>
			We couldn&apos;t fetch display you the data you&apos;re looking for. Please try again later, or if this
			issue persist, file a report.
		</Alert>
	);
};

const UserDashboardPlaceholder: React.FunctionComponent = () => {
	return (
		<div>
			<LinkListPlaceholder />
			<Row className="mt-4">
				<Col className="mx-auto" md={5}>
					<Shimmer
						pattern={
							<Placeholder.Button
								className="w-100 justify-content-center placeholder"
								variant="outline-secondary"
								disabled
							/>
						}
					/>
				</Col>
			</Row>
		</div>
	);
};

const UserDashboard: React.FunctionComponent<React.PropsWithChildren<{ uid: string }>> = ({ uid }) => {
	const baseQuery: Query<LinkData> = useMemo(() => {
		const db = getFirestore();
		return query(
			collection(db, COLLECTION_LINKS),
			where(new FieldPath(LinkField.USER, UserSnapshotField.UID), "==", uid),
			orderBy(LinkField.CREATE_TIME, "desc"),
			limit(FETCH_LIMIT)
		);
	}, [uid]);

	const links = useFirestoreInfiniteQuery(`links-${uid}`, baseQuery, (snapshot) => {
		if (snapshot.size === 0 || snapshot.size % FETCH_LIMIT > 0) return undefined;

		const endDoc = snapshot.docs[snapshot.size - 1];
		return query(baseQuery, startAfter(endDoc));
	});

	if (!links.data?.pages[0]?.size) {
		if (links.isLoading || links.isFetching) return <LinkListPlaceholder />;
		if (links.isError) {
			console.error(`fetch error: ${links.error}`);
			return <ErrorView />;
		}

		return <EmptyView />;
	}

	return (
		<div>
			<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
				{links.data.pages.map((page, i) => (
					<LinkConcat key={`page-${i}`} snapshot={page.docs} />
				))}
			</Row>
			<ExpandButton
				className="mt-4"
				state={links.isLoading || links.isFetching ? "loading" : "none"}
				onClick={() => links.fetchNextPage()}
				disabled={!links.hasNextPage || !links.isSuccess}
			>
				{links.hasNextPage ? "Load more" : "End"}
			</ExpandButton>
		</div>
	);
};

const Dashboard: NextPage = () => {
	const { data: user, isLoading } = useAuthUser(["usr"], getAuth());

	return (
		<PageContainer>
			<Metadata title="Dashboard - Get Link" description="See your upload history and more." />
			<Header />
			<PageContent>
				<h1 className="mb-4">Recent links</h1>
				{user?.uid ? (
					<UserDashboard uid={user.uid} />
				) : isLoading ? (
					<UserDashboardPlaceholder />
				) : (
					<EmptyView />
				)}
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export default Dashboard;
