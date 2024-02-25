import React, { useEffect, useMemo, useState } from "react";
import { useFirestoreDocumentData, useFirestoreInfiniteQuery } from "@react-query-firebase/firestore";
import { createCFID, FileField, getFileDocRef } from "../../models/files";
import {
	documentId,
	FieldPath,
	onSnapshot,
	orderBy,
	query,
	QueryDocumentSnapshot,
	QuerySnapshot,
	startAfter,
	where,
} from "firebase/firestore";
import { getLinks, LinkData, LinkField } from "../../models/links";
import Row from "react-bootstrap/Row";
import { ExpandButton } from "../ExpandButton";
import Col from "react-bootstrap/Col";
import { LinkSquareCard } from "../cards/LinkSquareCard";
import { RecentListPlaceholder } from "./RecentListPlaceholder";
import { OrderField } from "../../models/order";

const IMPLICIT_FETCH_LIMIT = 12;

export const Backlinks: React.FunctionComponent<BacklinksProps> = ({
	uid,
	fid,
	errorView,
	emptyView,
}) => {
	// backlinks as specified in the file document itself
	const [directBacklinks, setDirectBacklinks] = useState<QuerySnapshot<LinkData> | null | undefined>();
	const [directBacklinksError, setDirectBacklinksError] = useState(false);

	const fileDoc = useFirestoreDocumentData([fid], getFileDocRef(createCFID(fid)));

	// links from the link collection, that has reference to this fid
	const implicitBacklinksQuery = query(
		getLinks(),
		orderBy(new FieldPath(LinkField.FILES, createCFID(fid), OrderField.CREATE_ORDER), "desc"),
	);
	const implicitBacklinks = useFirestoreInfiniteQuery([`imp-bls-${fid}`], implicitBacklinksQuery, (snapshot) => {
		if (snapshot.size === 0 || snapshot.size % IMPLICIT_FETCH_LIMIT > 0) return undefined;

		const endDoc = snapshot.docs[snapshot.size - 1];
		return query(implicitBacklinksQuery, startAfter(endDoc));
	});

	// converting to string because reference to fileDoc appears to be changing on each render
	const directLids = Object.keys(fileDoc.data?.[FileField.LINKS] || {}).join(";");
	useEffect(() => {
		if (directLids.length === 0) {
			setDirectBacklinks(null);
			setDirectBacklinksError(false);
			return;
		}

		const lidList = directLids.split(";");
		const firstThirty = lidList.slice(0, 30);
		return onSnapshot(query(
			getLinks(),
			where(documentId(), "in", firstThirty)
		), snapshot => {
			setDirectBacklinks(snapshot);
			setDirectBacklinksError(false);
		}, error => {
			console.error("Get direct backlinks failed: ", error);
			setDirectBacklinks(null);
			setDirectBacklinksError(true);
		});
	}, [directLids, uid]);

	// combination of direct and implicit backlinks; ordered by create time
	const combined = useMemo<QueryDocumentSnapshot<LinkData>[]>(() => {
		const comb = directBacklinks?.docs || [];
		implicitBacklinks.data?.pages.forEach(value => comb.push(...value.docs));

		return comb.sort((a, b) => {
			const aData = a.data({ serverTimestamps: "estimate" });
			const bData = b.data({ serverTimestamps: "estimate" });

			return (bData?.[LinkField.CREATE_TIME]?.seconds || 0) - (aData?.[LinkField.CREATE_TIME]?.seconds || 0);
		});
	}, [directBacklinks?.docs, implicitBacklinks.data?.pages]);

	if (!directBacklinks?.size && !implicitBacklinks.data?.pages[0].size) {
		if (directBacklinks === undefined || implicitBacklinks.isLoading || implicitBacklinks.isFetching) return <RecentListPlaceholder limit={3} />;
		if (directBacklinksError || implicitBacklinks.error) return errorView();
		return emptyView();
	}

	return <div>
		<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
			{combined.map((link) => (
				<Col key={`col-${link.id}`}>
					<LinkSquareCard link={link} />
				</Col>
			))}
		</Row>
		{/* button to load more implicit backlinks
		 	note: all of direct backlinks are loaded at once, and automatically */}
		<ExpandButton
			className="mt-4"
			state={implicitBacklinks.isLoading || implicitBacklinks.isFetching ? "loading" : "none"}
			onClick={() => implicitBacklinks.fetchNextPage()}
			disabled={!implicitBacklinks.hasNextPage || !implicitBacklinks.isSuccess}
		>
			{implicitBacklinks.hasNextPage ? "Load more" : "End"}
		</ExpandButton>
	</div>;
};

export interface BacklinksProps {
	uid: string,
	fid: string,
	emptyView: () => React.ReactElement,
	errorView: () => React.ReactElement,
}
