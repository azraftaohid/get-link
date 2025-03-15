import { useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import {
    collection,
    FieldPath,
    getFirestore,
    limit,
    orderBy,
    query,
    Query,
    QueryDocumentSnapshot,
    startAfter,
    where,
} from "firebase/firestore";
import React, { useMemo } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { COLLECTION_LINKS, LinkData, LinkField } from "../../models/links";
import { UserSnapshotField } from "../../models/users";
import { LinkSquareCard } from "../cards/LinkSquareCard";
import { ExpandButton } from "../ExpandButton";
import { RecentListPlaceholder } from "./RecentListPlaceholder";

const LINK_FETCH_LIMIT = 12;

export const LinkConcat: React.FunctionComponent<React.PropsWithChildren<{ snapshot: QueryDocumentSnapshot<LinkData>[] }>> = ({
	snapshot,
}) => {
	return (
		<>
			{snapshot.map((file) => (
				<Col key={`col-${file.id}`}>
					<LinkSquareCard link={file} />
				</Col>
			))}
		</>
	);
};

export const RecentLinks: React.FunctionComponent<RecentLinksProps> = ({
	uid,
	emptyView,
	errorView,
}) => {
	const baseQuery: Query<LinkData> = useMemo(() => {
		const db = getFirestore();
		return query(
			collection(db, COLLECTION_LINKS),
			where(new FieldPath(LinkField.USER, UserSnapshotField.UID), "==", uid),
			orderBy(LinkField.CREATE_TIME, "desc"),
			limit(LINK_FETCH_LIMIT)
		);
	}, [uid]);

	const links = useFirestoreInfiniteQuery(`links-${uid}`, baseQuery, (snapshot) => {
		if (snapshot.size === 0 || snapshot.size % LINK_FETCH_LIMIT > 0) return undefined;

		const endDoc = snapshot.docs[snapshot.size - 1];
		return query(baseQuery, startAfter(endDoc));
	});

	if (!links.data?.pages[0]?.size) {
		if (links.isLoading || links.isFetching) return <RecentListPlaceholder />;
		if (links.isError) {
			console.error("Links fetch error: ", links.error);
			return errorView();
		}

		return emptyView();
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

export interface RecentLinksProps {
	uid: string
	emptyView: () => React.ReactElement,
	errorView: () => React.ReactElement,
}
