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
