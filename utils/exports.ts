import { DocumentReference, Unsubscribe, onSnapshot } from "firebase/firestore";
import { Bundle, ExportData, ExportField, OutputField, getExport } from "../models/exports";
import { ExportLinkResponseData } from "../pages/api/export-link";
import { Abandon, Abandonments, AbandonnedError } from "./abandon";

const timeoutMs = (9 + (3 / 60)) * 60 * 1000;

export async function initiateLinkExport(lid: string): Promise<[ExportLinkResponseData, Response]> {
	const response = await fetch(`/api/export-link?lid=${lid}`, { method: "GET" });
	return [await response.json(), response];
}

async function exportLink0(lid: string, onProgress: (progress: number) => unknown, abandonments: Abandonments) {	
	if (abandonments.hasAbandoned) throw new AbandonnedError();
	
	let docRef: DocumentReference<ExportData>;
	try {
		const rslt = (await initiateLinkExport(lid))[0];
		docRef = getExport(rslt.docId);
	} catch (error) {
		throw new Error("Unable to initiate link export: " + error);
	}

	onProgress(33);

	const unsubscribe: [Unsubscribe | undefined] = [undefined];
	return new Promise<ExportLinkResult>((res, rej) => {
		if (abandonments.hasAbandoned) throw new AbandonnedError();
		unsubscribe[0] = onSnapshot(docRef, { next: (snapshot) => {
			const data = snapshot.data();
			if (!data) {
				return rej(new Error("Export document not found."));
			}
	
			const output = data[ExportField.OUTPUT] || { };
			const breakpoints = data[ExportField.BREAKPOINTS];
			const {
				[OutputField.BUNDLES]: bundles,
				[OutputField.ERROR]: error,
				[OutputField.SKIPPED]: skips,
				[OutputField.STATE]: state,
			} = output;

			switch (state) {
				case "SUCCESS":
					onProgress(100);
					return res({
						bundles: bundles || [],
						skips: Object.keys(skips || {}),
					});
				case "FAILED":
					return rej(new Error(`Export failed with the following error: ${error?.message}`));
				case "PROCESSING":
					if (breakpoints?.count && bundles) {
						onProgress(66 + Math.floor((bundles.length / breakpoints.count) * 33));
					} else {
						onProgress(66);
					}
					break;
			}
		}, error: (error) => {
			rej(new Error(`Export document read failed: ${error.code}; ${error.message}`));
		} });
	}).then((result) => {
		unsubscribe[0]?.();
		return result;
	}).catch(err => {
		unsubscribe[0]?.();
		throw err;
	});
}

export function exportLink(lid: string, onProgress: (progress: number) => unknown): [Promise<ExportLinkResult>, Abandon] {
	const abandonments: Abandonments = {
		handler: () => {},
		hasAbandoned: false,
	};

	return [new Promise<ExportLinkResult>((res, rej) => {
		abandonments.handler = () => rej(new AbandonnedError());

		setTimeout(() => rej(new Error("Request timeout.")), timeoutMs);
		exportLink0(lid, onProgress, abandonments).then(res).catch(rej);
	}), () => {
		abandonments.hasAbandoned = true;
		console.debug("Abandon posted");
		abandonments.handler();
	}];
}

export interface ExportLinkResult {
	bundles: Bundle[],
	skips: string[],
}
