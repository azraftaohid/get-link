import { fromBuffer } from "file-type/browser";
import { customAlphabet } from "nanoid";
import { Dimension } from "../models/dimension";
import { MimeType, mimeTypes } from "./mimeTypes";
import { toBase } from "./numbers";
import { initPdfWorker } from "./pdf";
import { getStorage } from "./storage";
import { extractExtension } from "./strings";
import { DOMAIN, createAbsoluteUrl, createUrl } from "./urls";

export const acceptedFileFormats: string[] | undefined = undefined;

export const NON_PREVIEWABLE_IMAGE_TYPES = ["image/vnd.adobe.photoshop"];

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

// Base 64 web-safe chars ordered by ASCII
// see: https://gist.github.com/mikelehen/3596a30bd69384624c11
const fileNameChars = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

// Timestamp used as a reference for file names to which current timestamp is approaching
// It is calculated as the largest 8 characters possible by fileNameChars: 63*64^7 + 63*64^6 + ... + 63*64^0
const fileNameReferenceTimestamp = 281474976710655;

let fileNameSuffixGenerator: (size: number) => string | undefined;
/**
 * Creates a file display name without extension that decreases monotonically.
 */
export function createFileNamePrefix() {
	// We are using a reference timestamp, and the difference between current and that timestamp as base for our file name.
	// The difference is guaranteed to decrease as we approach the reference timestamp.
	// While the current difference, when converted, is 8 chars long, it may become 7 or lower as we approach the reference timestamp
	// Hence, to ensure the order is not broken, we are padding zeroth character before
	const prefix = toBase(fileNameReferenceTimestamp - new Date().getTime(), fileNameChars).padStart(8, fileNameChars[0]);
	// We are also appending required number of random characters at the end to ensure uniqueness; total length to be 12 chars long
	const suffix = (fileNameSuffixGenerator || (fileNameSuffixGenerator = customAlphabet(fileNameChars)))(6);

	return prefix + suffix;
}

export function createViewLink(id: string, absolute = false) {
	return !absolute ? createUrl("v", id) : createAbsoluteUrl(DOMAIN, "v", id);
}

export function compartDirectLink(url: string): {
	path: string;
	token: string | null;
} {
	const storage = getStorage();
	const urlInstance = new URL(url);

	const path = urlInstance.pathname.split(`${storage.fileUrl}/${storage.defaultBucket}`)[1];
	const token = urlInstance.searchParams.get("Authorization");
	if (typeof path !== "string") throw new Error(`invalid direct link: ${url}`);

	return { path, token };
}


export function makeDirectLink(path: string, token?: string) {
	const storage= getStorage();
	const fileUrl = `${storage.fileUrl}/${storage.defaultBucket}/${path}`;
	return token ? `${fileUrl}?Authorization=${token}` : fileUrl;
}

export function isValidDirectLink(url: string) {
	const storage = getStorage();
	return url.startsWith(storage.fileUrl);
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
	[prop in keyof Dimension]?: number | string;
} & {
	name?: string,
};
