import { fromBlob } from "file-type/browser";
import core from "file-type/core";
import { UploadMetadata } from "firebase/storage";
import { initPdfWorker } from "./pdf";
import { extractExtension } from "./strings";
import { createAbsoluteUrl, createUrl, DOMAIN } from "./urls";

export function createFileLink(id: string, absolute = false) {
	return !absolute ? createUrl("v", id) : createAbsoluteUrl(DOMAIN, "v", id);
}

export async function getVideoDimension(src: string): Promise<Dimension> {
	const element = document.createElement("video");
	return new Promise((res) => {
		element.onloadedmetadata = () => {
			res([element.videoWidth, element.videoHeight]);
		};

		element.src = src;
	});
}

export async function getImageDimension(src: string): Promise<Dimension> {
	const image = new Image();
	return new Promise((res) => {
		image.onload = () => {
			const w = image.width;
			const h = image.height;
			
			res([w, h]);
		};
		
		image.src = src;
	});
}

export async function getPdfDimension(src: string): Promise<Dimension> {
	const pdfjs = await initPdfWorker();
	if (!pdfjs) return [undefined, undefined];

	const pdfLoader = pdfjs.getDocument(src);
	const pdf = await pdfLoader.promise;

	if (pdf.numPages === 0) return [undefined, undefined];
	const page = await pdf.getPage(1);
	const viewport = page.getViewport({ scale: 1 });

	return [viewport.width, viewport.height];
}

export async function getFileType(file: File): Promise<[string | undefined, string]> {
	const type = await fromBlob(file);
	
	let mime: MimeType | undefined = type?.mime;
	const ext = extractExtension(file.name);

	if (!mime) {
		switch(ext) {
			case ".svg": mime = "image/svg+xml"; break;
			case ".csv": mime = "text/csv"; break;
		}
	}

	return [mime, ext];
}

export type FilesStatus = "files:unknown-error" | 
	"files:upload-cancelled" | 
	"files:upload-error" | 
	"files:capture-error" |
	"files:creating-link";

export type FileCustomMetadata = UploadMetadata["customMetadata"] & {
	width?: number,
	height?: number,
}

export type Dimension = [number | undefined /* width */, number | undefined /* height */];

export type MimeType = core.MimeType | "image/svg+xml" | "text/csv";