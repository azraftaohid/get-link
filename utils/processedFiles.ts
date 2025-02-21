import { Warning } from "@/models/links";
import { DimensionField } from "../models/dimension";
import { FileData, FileField, getFileKey } from "../models/files";
import { OrderField } from "../models/order";
import { now } from "./dates";
import { getDownloadURL, getMetadata } from "./storage";

export async function makeProcessedFile(fid: string, lid?: string, data?: FileData): Promise<ProcessedFileData> {
	console.debug(`Making processed file [fid: ${fid}]`);
	const startTime = now();

	const fileKey = getFileKey(fid);
	const overrides = data?.[FileField.OVERRIDES] || {};
	// todo: use overrides to check for directLinks and metadata before requesting server data
	return await Promise.all([
		getDownloadURL(fileKey),
		getMetadata(fileKey),
	]).then(([directLink, metadata]) => {
		console.debug(`File direct link and metadata received [fid: ${fid}; took: ${now() - startTime}ms]`);
		const type = overrides.mimeType || metadata.mimeType || "application/octet-stream";
		const pos = lid ? data?.[FileField.LINKS]?.[lid][OrderField.CREATE_ORDER] : undefined;

		// TODO: metadata#customMetadata#name may produce spaces as '+' character; find a workaround
		let name = overrides.customMetadata?.name || metadata.customMetadata?.name;
		if (!name) {
			const disposition = metadata.contentDisposition;
			const encodedName = disposition?.split("inline; filename*=utf-8''")[1];
			if (encodedName) name = decodeURIComponent(encodedName);
		}

		return {
			fid, directLink, type, pos, name,
			size: +(overrides.size || metadata.size || 0),
			width: +(overrides.customMetadata?.[DimensionField.WIDTH] || metadata.customMetadata?.width || 0) || null,
			height: +(overrides.customMetadata?.[DimensionField.HEIGHT] || metadata.customMetadata?.height || 0) || null,
			warnings: data?.[FileField.WARNS] || null,
			uploadTimestamp: Number.isNaN(+metadata.uploadTimestamp) ? undefined : +metadata.uploadTimestamp,
		};
	});
}export function isProcessedFile(obj: unknown): obj is ProcessedFileData {
	return typeof obj === "object" &&
		obj !== null &&
		"fid" in obj &&
		"directLink" in obj &&
		"type" in obj &&
		"size" in obj;

}
export interface ProcessedFileData {
	fid: string;
	directLink: string;
	type: string;
	size: number;
	name?: string;
	pos?: number;
	width?: number | null;
	height?: number | null;
	/**
	 * @deprecated
	 * Thumbnails are generated on the fly; and for non-image files, see {@link /models/files#getThumbnailKey}
	 */
	smThumbnailUrl?: string;
	warnings?: Warning[] | null;
	uploadTimestamp?: number;
}

