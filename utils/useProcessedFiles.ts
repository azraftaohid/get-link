import { useEffect, useMemo, useRef, useState } from "react";
import { DimensionField } from "../models/dimension";
import { FileData, FileField, getFileKey } from "../models/files";
import { Warning } from "../models/links";
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
}

export function isProcessedFile(obj: unknown): obj is ProcessedFileData {
	return typeof obj === "object" &&
		obj !== null &&
		"fid" in obj &&
		"directLink" in obj &&
		"type" in obj &&
		"size" in obj;

}

export const useProcessedFiles = (docs: FileData[], lid?: string): UseProcessedFiles => {
	const [status, setStatus] = useState<UseProcessedFiles["status"]>("none");

	const [mapping, setMapping] = useState<Record<string, ProcessedFileData>>({ });
	const mappingRef = useRef(mapping);
	mappingRef.current = mapping;

	useEffect(() => {
		setStatus("loading");

		let hasInturrputed = false;
		const tasks: Promise<unknown>[] = [];

		const newMapping: Record<string, ProcessedFileData> = { };
		docs.forEach(doc => {
			const fid = doc[FileField.FID];
			if (!fid) {
				console.warn("fid not present on file doc; skipping to process file");
				return;
			}
			
			const current = mappingRef.current[fid];
			if (current) {
				newMapping[fid] = current;
				return;
			}

			tasks.push(makeProcessedFile(fid, lid, doc).then(value => {
				newMapping[fid] = value;
			}).catch(err => {
				if (err.code === "storage/object-not-found") return;
				throw err;
			}));
		});

		Promise.all(tasks)
			.then(() => {
				if (hasInturrputed) return;

				setMapping(newMapping);
				setStatus("success");
			}).catch(err => {
				if (hasInturrputed) return;

				console.error(`error processing files [cause: ${err}]`);
				setStatus("error");
			});

		return () => { hasInturrputed = true; };
	}, [docs, lid]);

	return {
		status,
		files: useMemo(() => Object.values(mapping), [mapping]).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)),
	};
};

export interface UseProcessedFiles {
	files: ProcessedFileData[],
	status: "none" | "success" | "error" | "loading",
}

export interface ProcessedFileData {
	fid: string,
	directLink: string,
	type: string,
	size: number,
	name?: string,
	pos?: number,
	width?: number | null,
	height?: number | null,
	smThumbnailUrl?: string,
	warnings?: Warning[] | null,
	uploadTimestamp?: number,
}
