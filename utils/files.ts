import { fromBlob } from "file-type/browser";
import { UploadMetadata } from "firebase/storage";
import { Dimension } from "../models/dimension";
import { MimeType } from "./mimeTypes";
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
	"application/rtf", // rich text format
	"application/vnd.microsoft.portable-executable", // .exe files
	"application/x-msdownload", // experimental .exe files,
	"application/vnd.android.package-archive", // .apk files
];

export const strAcceptedFileFormats = acceptedFileFormats.join(",");

export const executableTypes = [
	"application/vnd.microsoft.portable-executable",
	"application/x-msdownload",
	"application/vnd.android.package-archive",
];

const formatIconMapping: Record<string, string> = {
    "text/": "text",
    "video/": "video",
    "audio/": "audio",
    "application/pdf": "pdf",
    "application\\/((zip)|(gzip)|(x-zip-compressed))": "folder_zip",
    "application\\/.*(\\.spreadsheetml)|(\\.ms-excel).*": "ms-excel",
    "application\\/.*(\\.wordprocessingml)|(msword).*": "ms-word",
    "application\\/.*(\\.presentationml)|(\\.ms-powerpoint).*": "ms-powerpoint",
};

export function createFileLink(id: string, absolute = false) {
	return !absolute ? createUrl("v", id) : createAbsoluteUrl(DOMAIN, "v", id);
}

export async function getVideoDimension(src: string): Promise<Dimension> {
	const element = document.createElement("video");
	return new Promise((res, rej) => {
		element.onloadedmetadata = () => {
			const { videoWidth: width, videoHeight: height } = element;
			res({ width, height });
		};
        element.onerror = () => rej(new Error(`cause: ${element.error?.message}; code: ${element.error?.code}`));

		element.src = src;
	});
}

export async function getImageDimension(src: string): Promise<Dimension> {
	const image = new Image();
	return new Promise((res, rej) => {
		image.onload = () => {
			const { width, height } = image;
			res({ width, height });
		};
        image.onerror = () => rej(new Error("image could not be loaded"));
		
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
	} else if (mime === "application/zip" && ext === ".apk") {
		mime = "application/vnd.android.package-archive";
	}

	return [mime, ext];
}

export function isExecutable(mimeType: string) {
	return executableTypes.includes(mimeType);
}

export function findFileIcon(mimeType: string): string | undefined {
    const keys = Object.keys(formatIconMapping);
    const match = keys.find(key => mimeType.match(`^${key}`));

    return match ? `/image/ic/${formatIconMapping[match]}.png` : undefined;
}

export type FilesStatus = "files:unknown-error" | 
	"files:upload-cancelled" | 
	"files:upload-error" | 
	"files:capture-error" |
	"files:creating-link" |
	"files:too-large" |
    "files:creating-thumbnail";

export type FileCustomMetadata = UploadMetadata["customMetadata"] & Dimension;

