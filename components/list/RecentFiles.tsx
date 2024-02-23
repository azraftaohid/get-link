import React, { useCallback, useEffect, useRef, useState } from "react";
import { getDownloadURL, getStorage, ListFileNamesResponse } from "../../utils/storage";
import { createCFK } from "../../models/files";
import { Timestamp } from "firebase/firestore";
import { findFileIcon, NON_PREVIEWABLE_IMAGE_TYPES } from "../../utils/files";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { SquareCard } from "../cards/SquareCard";
import { createAbsoluteUrl, DOMAIN } from "../../utils/urls";
import { ExpandButton } from "../ExpandButton";
import { RecentListPlaceholder } from "./RecentListPlaceholder";

const FILE_FETCH_LIMIT = 100;

export const RecentFiles: React.FunctionComponent<RecentFilesProps> = ({
	uid,
	emptyView,
	errorView,
}) => {
	// undefined means initial fetch is not complete yet; while an empty map means that files are fetched however
	// the user has not uploaded any files yet
	const [files, setFiles] = useState<Map<string, FileItem>>();

	const [nextFileName, setNextFileName] = useState<string | null | undefined>();
	const [isLoading, setLoading] = useState(true);
	const [isError, setError] = useState(false);

	const _stateless = { nextFileName };
	const stateless = useRef(_stateless);
	stateless.current = _stateless;

	const fetchNext = useCallback(async () => {
		setLoading(true);
		const storage = getStorage();

		let response: ListFileNamesResponse;
		try {
			response = await storage.send("list_file_names", {
				method: "GET",
				query: {
					bucket: storage.defaultBucket,
					prefix: `users_v3/${uid}/`,
					maxFileCount: FILE_FETCH_LIMIT,
					...(stateless.current.nextFileName && { startFileName: stateless.current.nextFileName }),
				}
			});
		} catch (error) {
			console.error("list_file_names failed: ", error);
			return setError(true);
		}

		setNextFileName(response.nextFileName);
		setFiles(c => {
			const mapping = new Map(c);
			response.files?.forEach(value => {
				const key = value.fileName;
				const cfk = createCFK(key);

				let name = value.fileInfo?.name;
				if (!name) {
					const disposition = value.fileInfo?.["b2-content-disposition"];
					name = disposition?.split("inline; filename*=utf-8''")[1];
					if (name) name = decodeURIComponent(name);
					else name = value.fileName;
				}

				const mimeType = value.contentType || "application/octet";
				const createTime = value.uploadTimestamp ? Timestamp.fromMillis(value.uploadTimestamp) : undefined;

				let thumbnail: string | null;
				if (mimeType.startsWith("image/") && !NON_PREVIEWABLE_IMAGE_TYPES.includes(mimeType)) {
					thumbnail = getDownloadURL(value.fileName);
				} else {
					thumbnail = mimeType && findFileIcon(mimeType) || null;
				}

				mapping.set(key, { key, cfk, name, createTime, thumbnail });
			});

			return mapping;
		});

		setLoading(false);
	}, [uid]);

	useEffect(() => {
		// user switched; fetch from the beginning
		setFiles(undefined);
	}, [uid]);

	useEffect(() => {
		fetchNext();
	}, [fetchNext]);

	if (isError) return errorView();
	if (!files) return <RecentListPlaceholder limit={FILE_FETCH_LIMIT} />;
	if (files.size === 0) return emptyView();

	return <div>
		<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
			{Array.from(files.values()).map(file =>  <Col key={file.key}><SquareCard
				href={createAbsoluteUrl(DOMAIN, "f", file.cfk)}
				title={file.name}
				thumbnail={file.thumbnail}
				createTime={file.createTime}
				onThumbnailError={() => {
					file.thumbnail = null;
					setFiles(c => c ? new Map(c) : c);
				}}
			/></Col>)}
		</Row>
		<ExpandButton
			className="mt-4"
			state={isLoading ? "loading" : "none"}
			onClick={fetchNext}
			disabled={!nextFileName}
		>
			{nextFileName ? "Load more" : "End"}
		</ExpandButton>
	</div>;
};

interface FileItem {
	key: string,
	cfk: string,
	name: string,
	createTime?: Timestamp,
	thumbnail?: string | null,
}

export interface RecentFilesProps {
	uid: string,
	emptyView: () => React.ReactElement,
	errorView: () => React.ReactElement,
}
