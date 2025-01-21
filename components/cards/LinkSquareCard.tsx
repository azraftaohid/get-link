import { QueryDocumentSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { getFileKey, getThumbnailKey } from "../../models/files";
import { LinkData, LinkField } from "../../models/links";
import { findFileIcon, NON_PREVIEWABLE_IMAGE_TYPES } from "../../utils/files";
import { getDownloadURL, getMetadata, objectExists } from "../../utils/storage";
import { createAbsoluteUrl, DOMAIN } from "../../utils/urls";
import { SquareCard } from "./SquareCard";

export const LinkSquareCard: React.FunctionComponent<LinkSquareCardProps> = ({
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
		if (!fid) return setThumbnail(null);
		setThumbnail(undefined);

		const coverKey = getFileKey(fid);
		const thumbKey = getThumbnailKey(fid);
		Promise.all([objectExists(thumbKey).catch(console.warn), getMetadata(coverKey).catch(console.warn)]).then(([thumb, metadata]) => {
			if (thumb) return setThumbnail(getDownloadURL(thumbKey));

			const mimeType = metadata?.mimeType;
			if (mimeType?.startsWith("image/") && !NON_PREVIEWABLE_IMAGE_TYPES.includes(mimeType)) {
				const dl = getDownloadURL(coverKey);
				setThumbnail(dl);
			} else {
				setThumbnail(mimeType && findFileIcon(mimeType) || null);
			}
		});
	}, [cover?.fid]);

	return <SquareCard
		title={title || link.id}
		href={createAbsoluteUrl(DOMAIN, "v", link.id)}
		thumbnail={thumbnail}
		onThumbnailError={() => setThumbnail(null)}
		createTime={createTime}
		expireTime={expireTime}
	/>;
};

export interface LinkSquareCardProps {
	link: QueryDocumentSnapshot<LinkData>,
}
