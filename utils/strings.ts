import { IncomingMessage } from "http";
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
	return i !== -1 && i + 1 < fileName.length ? fileName.substring(0, i) : fileName;
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
 * @see https://www.designcise.com/web/tutorial/how-to-convert-javascript-readablestream-object-to-json
 */
function readStream(src: ReadableStream) {
	const reader = src.getReader();
	const decoder = new TextDecoder();
	const chunks: string[] = [];

	async function read() {
		const { done, value } = await reader.read();

		if (done) {
			return chunks.join("");
		}

		const chunk = decoder.decode(value, { stream: true });
		chunks.push(chunk);
		return read(); // read the next chunk
	}

	return read();
}

function readIncomingMessage(body: IncomingMessage): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const chunks: Uint8Array[] = [];
		body.on("data", (chunk => chunks.push(chunk)))
			.on("end", () => resolve(Buffer.concat(chunks).toString()))
			.on("error", (err) => reject(err));
	});
}

export function toText(body: ReadableStream | IncomingMessage): Promise<string> {
	if (body instanceof ReadableStream) return readStream(body);
	return readIncomingMessage(body);
}

/**
 * Escapes special characters (everything except A–Z a–z 0–9 - _).
 * Returned string should be fine to use with X-Bz-Info-b2-content-disposition header.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#description
 * @see https://www.backblaze.com/apidocs/b2-upload-file
 * 
 * @param str The subject string.
 * @returns Percent encoded variant of the provided string.
 */
export function percEncoded(str: string) {
	return encodeURIComponent(str)
		.replaceAll("!", "%21")
		.replaceAll("'", "%27")
		.replaceAll("(", "%28")
		.replaceAll(")", "%29")
		.replaceAll("*", "%2A")
		.replaceAll("+", "%2B")
		.replaceAll(".", "%2E")
		.replaceAll("~", "%7E");
}
