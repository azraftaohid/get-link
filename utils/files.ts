import { fromBlob } from "file-type/browser";
import core from "file-type/core";
import { UploadMetadata } from "firebase/storage";
import { Dimension } from "../models/dimension";
import { initPdfWorker } from "./pdf";
import { extractExtension } from "./strings";
import { createAbsoluteUrl, createUrl, DOMAIN } from "./urls";

export const acceptedFileFormats = [
	"audio/*", "video/*", "image/*", "text/*", 
	"application/pdf",
	"application/zip", 
	"application/x-zip-compressed",
	"application/gzip", 
	"application/json", 
	"application/xml", 
	"application/vnd.ms-excel", // legacy excel
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // current excel
	"application/vnd.openxmlformats-officedocument.spreadsheetml.template", // excel template
	"application/msword", // legacy word
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // current word
	"application/vnd.openxmlformats-officedocument.wordprocessingml.template", // word template
	"application/vnd.ms-powerpoint", // powerpoint
	"application/vnd.openxmlformats-officedocument.presentationml.presentation", 
	"application/vnd.openxmlformats-officedocument.presentationml.slideshow", 
	"application/vnd.openxmlformats-officedocument.presentationml.template", 
	"application/rtf" // rich text format
];

export const strAcceptedFileFormats = acceptedFileFormats.join(",");

export function createFileLink(id: string, absolute = false) {
	return !absolute ? createUrl("v", id) : createAbsoluteUrl(DOMAIN, "v", id);
}

export async function getVideoDimension(src: string): Promise<Dimension> {
	const element = document.createElement("video");
	return new Promise((res) => {
		element.onloadedmetadata = () => {
			const { videoWidth: width, videoHeight: height } = element;
			res({ width, height });
		};

		element.src = src;
	});
}

export async function getImageDimension(src: string): Promise<Dimension> {
	const image = new Image();
	return new Promise((res) => {
		image.onload = () => {
			const { width, height } = image;
			res({ width, height });
		};
		
		image.src = src;
	});
}

export async function getPdfDimension(src: string): Promise<Dimension> {
	const pdfjs = await initPdfWorker();
	if (!pdfjs) return { };

	const pdfLoader = pdfjs.getDocument(src);
	const pdf = await pdfLoader.promise;

	if (pdf.numPages === 0) return { };
	const page = await pdf.getPage(1);
	const { width, height } = page.getViewport({ scale: 1 });

	return { width, height };
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
	"files:creating-link" |
	"files:too-large";

export type FileCustomMetadata = UploadMetadata["customMetadata"] & {
	width?: number,
	height?: number,
}

export type MimeType = core.MimeType | "image/svg+xml" | "text/csv";