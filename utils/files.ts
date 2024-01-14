import { fromBuffer } from "file-type/browser";
import { Dimension } from "../models/dimension";
import { getBackblaze } from "./backblaze";
import { MimeType, mimeTypes } from "./mimeTypes";
import { initPdfWorker } from "./pdf";
import { extractExtension } from "./strings";
import { DOMAIN, createAbsoluteUrl, createUrl } from "./urls";

export const acceptedFileFormats: string[] | undefined = undefined;

export const NON_PREVIEW_SUPPORTING_TYPE = ["image/vnd.adobe.photoshop"];

export const executableTypes = [
	"application/vnd.microsoft.portable-executable",
	"application/x-msdownload",
	"application/vnd.android.package-archive",
	"application/postscript",
];

// key: (ext)|(mimeType)
// value: file display name
const formatIconMapping: Record<string, string> = {
	"(psd)|(image/vnd.adobe.photoshop)": "psd",
	"text/": "text",
	"video/": "video",
	"audio/": "audio",
	"(psd)|(application/pdf)": "pdf",
	"(zip)|(application\\/((zip)|(gzip)|(x-zip-compressed)))": "folder_zip",
	"application\\/.*(\\.spreadsheetml)|(\\.ms-excel).*": "ms-excel",
	"application\\/.*(\\.wordprocessingml)|(msword).*": "ms-word",
	"application\\/.*(\\.presentationml)|(\\.ms-powerpoint).*": "ms-powerpoint",
	"(ai)|(application/illustrator)": "ai",
	"(ps)|(application/postscript)": "code",
	"(odg)|(application/vnd.oasis.opendocument.graphics)": "odg",
	"(ods)|(application/vnd.oasis.opendocument.spreadsheet)": "ods",
	"(odp)|(application/vnd.oasis.opendocument.presentation)": "odp",
	"(odt)|(application/vnd.oasis.opendocument.text)": "odt",
};

export function createViewLink(id: string, absolute = false) {
	return !absolute ? createUrl("v", id) : createAbsoluteUrl(DOMAIN, "v", id);
}

export function compartDirectLink(url: string): {
	path: string;
	token: string | null;
} {
	const bb = getBackblaze();
	const urlInstance = new URL(url);

	const path = urlInstance.pathname.split(`${bb.b2BaseUrl}/${bb.config.defaultBucket}`)[1];
	const token = urlInstance.searchParams.get("Authorization");
	if (typeof path !== "string") throw new Error(`invalid direct link: ${url}`);

	return { path, token };
}


export function makeDirectLink(path: string, token?: string) {
	const bb = getBackblaze();
	// const fileUrl = `${bb.b2BaseUrl}/${bb.config.defaultBucket}/${path}`;
	const fileUrl = `https://${bb.config.defaultBucket}.s3.eu-central-${bb.config.clusterNo}.backblazeb2.com/${path}`;
	return token ? `${fileUrl}?Authorization=${token}` : fileUrl;
}

export function isValidDirectLink(url: string) {
	const bb = getBackblaze();
	return url.startsWith(bb.b2BaseUrl);
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
	if (!pdfjs) return {};

	const pdfLoader = pdfjs.getDocument(src);
	const pdf = await pdfLoader.promise;

	if (pdf.numPages === 0) return {};
	const page = await pdf.getPage(1);
	const { width, height } = page.getViewport({ scale: 1 });

	return { width, height };
}

export async function getFileType(file: File): Promise<[string | undefined, string]> {
	// Some browsers including chromiums have ArrayBuffer size limits.
	// For chromium browsers, that limit is near 2 GiB.
	// see: https://stackoverflow.com/a/72124984, and https://stackoverflow.com/a/73115301
	//
	// Most mime types start within the first 29153 bytes. FOr rare cases, we will be using the first 50 bytes.
	// see: https://stackoverflow.com/a/66847213
	const chunk = file.slice(0, 50 * Math.pow(2, 10));
	const bytes = await chunk.arrayBuffer();
	const type = await fromBuffer(bytes);

	let mime: MimeType | undefined = type?.mime;
	const ext = extractExtension(file.name);

	if (!mime) {
		mime = mimeTypes[ext as keyof typeof mimeTypes];
	} else if (mime === "application/zip") {
		if ([".apk", ".odg", ".ai", ".eps"].includes(ext)) mime = mimeTypes[ext as keyof typeof mimeTypes];
	} else if (mime === "application/postscript") {
		if ([".ai", ".eps"].includes(ext)) mime = mimeTypes[ext as keyof typeof mimeTypes];
	}

	return [mime, ext];
}

export function isExecutable(mimeType: string) {
	return executableTypes.includes(mimeType);
}

// todo: update all referencing function to call with file extension first
export function findFileIcon(extOrMimeType: string): string | undefined {
	const keys = Object.keys(formatIconMapping);
	const match = keys.find((key) => extOrMimeType.match(`^${key}`));

	return match ? `/image/ic/${formatIconMapping[match]}.png` : undefined;
}

export function prependExt(fullName: string, text: string) {
	const lastDot = fullName.lastIndexOf(".");
	if (lastDot === -1) return text + fullName;

	return fullName.slice(0, lastDot) + text + fullName.slice(lastDot);
}

export function shallowHash(file: File) {
	return `${file.name};${file.type};${file.size};${file.lastModified}`;
}

export type FilesStatus =
	| "files:unknown-error"
	| "files:upload-cancelled" // upload to firebase storage
	| "files:upload-paused"
	| "files:upload-failed"
	| "files:upload-completed"
	| "files:capture-failed" // capture: upload file, associate with a link
	| "files:capture-completed"
	| "files:too-large"
	| "files:creating-thumbnail"
	| "files:creating-doc"
	| "files:doc-created";

export type FileCustomMetadata = {
	[prop in keyof Dimension]?: string;
} & {
	name?: string,
};
