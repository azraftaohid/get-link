import { FIDComponents } from "../models/files";

const sizeThreshold = 950;
const sizeUnits = ["bytes", "KB", "MB", "GB", "TB"];

/**
 * `abc.xyz' -> '.xyz'
 */
export function extractExtension(name: string) {
	const i = name.lastIndexOf(".");
	return i !== -1 && i + 1 < name.length ? name.substring(i) : "";
}

export function extractDisplayName(fileName: string) {
	const i = fileName.lastIndexOf(".");
	return i !== -1 ? fileName.substring(0, i) : fileName;
}

export function compartFid(fid: string): FIDComponents {
	const segments = fid.split("/");
	const uid = segments[1] || "";
	const fileName = segments[2] || "";

	return { uid, fileName };
}

export function formatSize(bytes: number) {
	let unit = 0;
	let quantity = bytes;
	for (let limit = sizeUnits.length - 1; unit < limit && quantity >= sizeThreshold; unit++, quantity /= 1024);

	return `${quantity.toFixed(2)} ${sizeUnits[unit]}`;
}

/**
 * Escapes special characters (everything except A–Z a–z 0–9 - _).
 * Returned string should be fine to use with X-Bz-Info-b2-content-disposition header.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#description
 * @see https://www.backblaze.com/apidocs/b2-upload-file
 * 
 * @param name The file name.
 * @returns Escaped variant of the provided file name.
 */
export function escapeFilename(name: string) {
	return encodeURIComponent(name)
		.replaceAll("!", "%21")
		.replaceAll("'", "%27")
		.replaceAll("(", "%28")
		.replaceAll(")", "%29")
		.replaceAll("*", "%2A")
		.replaceAll("+", "%2B")
		.replaceAll(".", "%2E")
		.replaceAll("~", "%7E");
}
