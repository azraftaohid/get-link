import { fromBlob } from "file-type/browser";
import { UploadMetadata } from "firebase/storage";
import { Dimension } from "../models/dimension";
import { MimeType } from "./mimeTypes";
import { initPdfWorker } from "./pdf";
import { extractExtension } from "./strings";
import { DOMAIN, createAbsoluteUrl, createUrl } from "./urls";

export const STORAGE_URL_PREFIX =
	process.env.NODE_ENV === "development"
		? `http://localhost:9199/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o`
		: `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o`;

export const acceptedFileFormats = [
	"audio/*",
	"video/*",
	"image/*",
	"text/*",
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
	"application/vnd.android.package-archive", // .apk files,
	"application/vnd.oasis.opendocument.graphics", // libreoffice design; .odg files
	"application/vnd.oasis.opendocument.spreadsheet", // libreoffice calc; .ods files
	"application/vnd.oasis.opendocument.presentation", // libreoffice impress; .odp files
	"application/vnd.oasis.opendocument.text", // libreoffice writer; .odt files
	"application/illustrator", // .ai files
	"application/postscript", // .ai, .eps, .ps files
	"image/vnd.adobe.photoshop", // .psd files
];

export const NON_PREVIEW_SUPPORTING_TYPE = ["image/vnd.adobe.photoshop"];

export const strAcceptedFileFormats = acceptedFileFormats.join(",");

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
	token: string;
} {
	const instance = new URL(url);

	const path = instance.pathname.substring(instance.pathname.lastIndexOf("/") + 1);
	const token = instance.searchParams.get("token");
	if (typeof path !== "string" || typeof token !== "string") throw new Error(`invalid direct link: ${url}`);

	return { path, token };
}

export function makeDirectLink(path: string, token: string) {
	return `${STORAGE_URL_PREFIX}/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export function isValidDirectLink(url: string) {
	return url.startsWith(STORAGE_URL_PREFIX) && url.includes("&token=");
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
	const type = await fromBlob(file);

	let mime: MimeType | undefined = type?.mime;
	const ext = extractExtension(file.name);

	if (!mime) {
		switch (ext) {
			case ".svg":
				mime = "image/svg+xml";
				break;
			case ".csv":
				mime = "text/csv";
				break;
		}
	} else if (mime === "application/zip") {
		switch (ext) {
			case ".apk":
				mime = "application/vnd.android.package-archive";
				break;
			case ".odg":
				mime = "application/vnd.oasis.opendocument.graphics";
				break;
			case ".ai":
			case ".eps":
				mime = "application/illustrator";
				break;
		}
	} else if (mime === "application/postscript") {
		switch (ext) {
			case ".ai":
			case ".eps":
				mime = "application/illustrator";
				break;
		}
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

export type FileCustomMetadata = UploadMetadata["customMetadata"] & {
	[prop in keyof Dimension]?: string;
};
