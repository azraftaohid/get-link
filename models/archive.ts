import { getAuth } from "firebase/auth";
import { CollectionReference, Timestamp, Unsubscribe, collection, doc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import { v5 as uuidV5 } from "uuid";
import { Abandon, Abandonments, AbandonnedError } from "../utils/abandon";
import { UserSnapshot, UserSnapshotField } from "./users";

export enum ArchiveField {
	LID = "lid",
	FIDS = "fids",
	BREAKPOINTS = "breakpoints",
	FILENAME_PREFIX = "filename_prefix",
	OUTPUT = "output",
	USER = "user",
};

export enum OutputField {
	DOWNLOAD_LINKS = "download_links",
	ERROR = "error",
	SKIPPED = "skipped",
	CONTINUE_TOKEN = "continue_token",
	START_TIME = "start_time",
	END_TIME = "end_time",
	STATE = "state",
};

export enum DownloadLinkField {
	URL = "url",
	NAME = "name",
	SIZE = "size",
}

const NAMESPACE_ARCHIVE_REQ_ID = "b2325a57-1dd1-4663-9d4f-5e3e80045c25";

const COLLECTION_ARCHIVE = "archives";

const timeoutMs = (9 + (3 / 60)) * 60 * 1000;

export function getArchives(): CollectionReference<ArchiveData> {
	return collection(getFirestore(), COLLECTION_ARCHIVE);
}

export function getArchive(lid: string) {
	return doc(getArchives(), uuidV5(lid, NAMESPACE_ARCHIVE_REQ_ID));
}

async function makeRequest0(lid: string, onProgress: (progress: number) => unknown, abandonments: Abandonments) {
	const docRef = getArchive(lid);
	const uid = getAuth().currentUser?.uid;
	
	if (abandonments.hasAbandoned) throw new AbandonnedError();
	try {
		await setDoc(docRef, {
			[ArchiveField.LID]: lid,
			[ArchiveField.USER]: {
				[UserSnapshotField.UID]: uid,
			},
		}, { merge: true });
	} catch (error) {
		throw new Error("Document create for archive request failed: " + error);
	}

	onProgress(33);

	const unsubscribe: [Unsubscribe | undefined] = [undefined];
	return new Promise<ArchiveResult>((res, rej) => {
		if (abandonments.hasAbandoned) throw new AbandonnedError();
		unsubscribe[0] = onSnapshot(docRef, { next: (snapshot) => {
			const data = snapshot.data();
			if (!data) {
				return rej(new Error("Archive request document not found."));
			}
	
			const output = data[ArchiveField.OUTPUT] || { };
			const breakpoints = data[ArchiveField.BREAKPOINTS];
			const {
				[OutputField.DOWNLOAD_LINKS]: links,
				[OutputField.ERROR]: error,
				[OutputField.SKIPPED]: skips,
				[OutputField.STATE]: state,
			} = output;

			switch (state) {
				case "SUCCESS":
					onProgress(100);
					return res({
						links,
						skips: Object.keys(skips || {}),
					});
				case "FAILED":
					return rej(new Error(`Archive failed with the following error: ${error?.message}`));
				case "PROCESSING":
					if (breakpoints?.count && links) {
						onProgress(66 + Math.floor((links.length / breakpoints.count) * 33));
					} else {
						onProgress(66);
					}
					break;
			}
		}, error: (error) => {
			rej(new Error(`Archive document read failed: ${error.code}; ${error.message}`));
		} });
	}).then((result) => {
		unsubscribe[0]?.();
		return result;
	}).catch(err => {
		unsubscribe[0]?.();
		throw err;
	});
}

export function requestArchive(lid: string, onProgress: (progress: number) => unknown): [Promise<ArchiveResult>, Abandon] {
	const abandonments: Abandonments = {
		handler: () => {},
		hasAbandoned: false,
	};

	return [new Promise<ArchiveResult>((res, rej) => {
		abandonments.handler = () => rej(new AbandonnedError());

		setTimeout(() => rej(new Error("Request timeout.")), timeoutMs);
		makeRequest0(lid, onProgress, abandonments).then(res).catch(rej);
	}), () => {
		abandonments.hasAbandoned = true;
		console.debug("Abandon posted");
		abandonments.handler();
	}];
}

export type ArchiveResult = { links?: DownloadLink[], skips?: string[] };

export interface DownloadLink {
	[DownloadLinkField.URL]?: string,
	[DownloadLinkField.NAME]?: string,
	[DownloadLinkField.SIZE]?: number,
}

export interface Output {
	[OutputField.DOWNLOAD_LINKS]?: DownloadLink[],
	[OutputField.ERROR]?: { message: string, instance_id: string },
	[OutputField.SKIPPED]?: Record<string, string>,
	[OutputField.START_TIME]?: Timestamp,
	[OutputField.END_TIME]?: Timestamp,
	[OutputField.STATE]?: "PENDING" | "SUCCESS" | "FAILED" | "PROCESSING",
}

export interface ArchiveData {
	[ArchiveField.LID]?: string,
	[ArchiveField.FIDS]?: { count?: number, data?: string[] },
	[ArchiveField.BREAKPOINTS]?: { count?: number, data?: number[] },
	[ArchiveField.FILENAME_PREFIX]?: "ORDER" | false,
	[ArchiveField.OUTPUT]?: Output,
	[ArchiveField.USER]?: UserSnapshot,
}
