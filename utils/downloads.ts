import { FetchError } from "./errors/FetchError";

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

export type OnProgress = (received: number, total: number) => unknown;
