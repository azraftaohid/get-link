import { Writer } from "@transcend-io/conflux";
import { FetchError } from "./errors/FetchError";
import { getDownloadURL } from "./storage";

export const THRESHOLD_DIRECT_DOWNLOAD = 30 * 1024 * 1024; // 30 MB

export function shouldStepOutDownload() {
	return (
		(typeof Modernizr !== "undefined" && !Modernizr.adownload) ||
		(typeof window !== "undefined" && window.navigator.userAgent.includes("FB_IAB/"))
	);
}

export function downloadBlob(blob: Blob, name?: string) {
	const url = URL.createObjectURL(blob);
	downloadFromUrl(url, name);

	URL.revokeObjectURL(url);
}

export async function directDownloadFromUrl(url: string, name: string | undefined, onProgress: OnProgress) {
	const blob = await getBlob(url, onProgress);
	return downloadBlob(blob, name);
}

export function downloadFromUrl(url: string, defaultName?: string) {
	const pretender = document.createElement("a");

	pretender.download = defaultName || "";
	pretender.href = url;
	pretender.target = "_blank"; // for browsers that ignore the download attribute

	pretender.addEventListener("error", (evt) => {
		console.warn(`error direct downloading [cause: ${evt.error}]`);
		window.open(url, "_blank");
	});

	document.body.appendChild(pretender);
	pretender.click();
	pretender.remove();
}

export async function getBlob(downloadUrl: string, onProgress?: OnProgress): Promise<Blob> {
	return new Promise((res, rej) => {
		const xhr = new XMLHttpRequest();
		xhr.onload = () => {
			const { status, response } = xhr;
			if (status !== 200) rej(new FetchError(xhr.status, "error getting blob file"));
			else if (typeof response === "object" && response.constructor.name === "Blob") res(response);
			else
				rej(
					new Error(
						`invalid response type [expected: Blob; actual: ${
							typeof response === "object" ? response.constructor.name : typeof response
						}]`
					)
				);
		};

		xhr.onprogress = ({ loaded, total }) => {
			onProgress?.(loaded, total);
		};

		xhr.responseType = "blob";
		xhr.open("GET", downloadUrl);
		xhr.send();
	});
}

export async function downloadAsZip(params: DownloadAsZipParams): Promise<DownloadAsZipResult> {
	// let processed = 0;
	const skipped: Record<string, string> = { };

	const streamsaver = (await import("streamsaver")).default;
	const saver = streamsaver.createWriteStream(params.saveAs, { size: params.size });

	const fileIterator = params.files.values();
	const files = new ReadableStream({
		async pull(controller) {
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const { done, value: file } = fileIterator.next();
				if (done) return controller.close();

				const friendlyName = `${file.downloadName || file.fileName.split("/").pop()}`;
				let fileRes: Response;
				try {
					fileRes = await fetch(getDownloadURL(file.fileName), { method: "GET" });
				} catch (e) {
					console.error(e);
					skipped[friendlyName] = "unknown_error;";
					continue;
				}

				if (fileRes.status === 404) {
					skipped[friendlyName] = "not_found;";
					continue;
				}
				if (fileRes.status !== 200) {
					skipped[friendlyName] = "get_failed;" + fileRes.status;
					continue;
				}
				if (!fileRes.body) {
					skipped[friendlyName] = "empty_body";
					continue;
				}

				return controller.enqueue({
					name: `/${friendlyName}`,
					stream: () => fileRes.body,
				});
			}
		}
	});

	return files.pipeThrough(new Writer()).pipeTo(saver).then(() => ({ skipped }));
}

export type OnProgress = (received: number, total: number) => unknown;

export interface DownloadAsZipParams {
	saveAs: string,
	files: { fileName: string, downloadName?: string }[],
	size?: number,
}

export interface DownloadAsZipResult {
	skipped: Record<string, string>,
}
