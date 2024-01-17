import { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpHandlerOptions, RequestHandlerOutput, StreamingBlobPayloadInputTypes } from "@smithy/types";
import { IncomingMessage } from "http";
import { AppHttpHandler } from "./AppHttpHandler";
import { B2ApiTypes, B2HeadFileResponse, Backblaze, getBackblaze } from "./backblaze";
import { now } from "./dates";
import { NotFound } from "./errors/NotFound";
import { StorageError } from "./errors/StorageError";
import { makeDirectLink } from "./files";
import { toText } from "./strings";
import { ErrorListener, ProgressListener, Upload, UploadParams } from "./upload/Upload";

export const buckets: Record<string, string> = {
	"getlink-dev": "4511a042c944c90587c00d1e",
	"getlink": "05a1d0b26924d9f587c00d1e"
};

export function requireBucketId(bucketName: string) {
	const id = buckets[bucketName];
	if (!id) throw new Error("Unsupported bucket: " + bucketName);
	return id;
}

export class Storage {
	private static instances: Map<Backblaze, Storage>;

	private b2: Backblaze;
	public readonly requestHandler: AppHttpHandler;

	private constructor(b2: Backblaze) {
		this.b2 = b2;
		this.requestHandler = AppHttpHandler.getInstance();
	}

	public static getInstance(b2: Backblaze = getBackblaze()) {
		let instance = (Storage.instances || (Storage.instances = new Map())).get(b2);
		if (!instance) {
			instance = new Storage(b2);
			Storage.instances.set(b2, instance);
		}

		return instance;
	}

	private static isRetriable(req: HttpRequest) {
		return req.method === "GET" || req.method === "HEAD" || typeof req.body === "string";
	}

	public async send<K extends keyof B2ApiTypes>(api: K, options: B2ApiTypes[K][0], params: HttpHandlerOptions = { requestTimeout: 3000 }): Promise<B2ApiTypes[K][1]> {
		const request = await this.b2.sign(api, options);

		const startTime = now();
		let result: RequestHandlerOutput<HttpResponse> | undefined;
		for (let attempt = 1, limit = Storage.isRetriable(request) ? 3 : 1; ; attempt++) {
			console.debug(`Sending API ${api} request; attempt: ${attempt}/${limit}`);
			try {
				result = await this.requestHandler.handle(request, params);
				if (result.response.statusCode === 504 || result.response.statusCode === 502) 
					throw new Error("Gateway timed out!");
				break;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") throw error;
				if (attempt >= limit) throw error;
			}
		}
		console.debug(`API ${api} response received [took: ${now() - startTime}]`);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let body: any = { };
		// response#body can be: Blob, ReadableStream, http.IncomingMessage
		// see: https://github.com/aws/aws-sdk-js-v3/blob/main/packages/xhr-http-handler/src/xhr-http-handler.ts#L182C1-L193C18
		// see: https://github.com/aws/aws-sdk-js-v3/blob/main/packages/xhr-http-handler/src/xhr-http-handler.ts#L182C1-L193C18
		// see: https://github.com/smithy-lang/smithy-typescript/blob/main/packages/node-http-handler/src/node-http-handler.ts#L134C1-L144C10
		if (result.response.body instanceof ReadableStream || result.response.body instanceof IncomingMessage) {
			console.debug("Response#body is instance of " + result.response.body.constructor.name);
			try {
				const txt = await toText(result.response.body);
				if (txt) body = JSON.parse(txt);
			} catch (error) {
				throw new StorageError("storage:json-parse-error", "Response#body can not be parsed as JSON", error);
			}
		} else if (result.response.body instanceof Blob) {
			console.debug("Response#body is instance of Blob");
			body = { blob: result.response.body };
		}
		
		switch (result.response.statusCode) {
			case 200: return { ...result.response.headers, ...body };
			case 404: throw new NotFound();
			default: throw new StorageError("storage:api-error", `status: ${result.response.statusCode}; reason: ${result.response.reason}`, null);
		}
	}
}

export function getDownloadURL(key: string): string {
	return makeDirectLink(key);
}

export async function headObject(key: string) {
	console.debug("Heading file: " + key);
	const startTime = now();

	const storage = Storage.getInstance();

	let result: B2HeadFileResponse;
	try {
		result = await storage.send("b2_head_file", {
			url: getDownloadURL(key),
			method: "HEAD",
		});
	} catch (error) {
		console.debug(`Head file failed [key: ${key}; took: ${now() - startTime}ms]`);
		throw error;
	}

	console.debug(`File headers received [key: ${key}; took: ${now() - startTime}ms]`);
	return result;
}

export async function getMetadata(key: string): Promise<FileMetadata> {
	const headers = await headObject(key);

	const customMetadata: Record<string, string> = {};
	Object.keys(headers).forEach(key => {
		const lowered = key.toLowerCase();
		if (!lowered.startsWith("x-bz-info-")) return;
		customMetadata[lowered.split("x-bz-info-")[1]] = headers[key as keyof typeof headers];
	});

	return {
		id: headers["x-bz-file-id"],
		key: headers["x-bz-file-name"],
		size: +headers["content-length"],
		contentType: headers["content-type"],
		contentDisposition: headers["content-disposition"],
		sha1Checksum: headers["x-bz-content-sha1"],
		uploadTimestamp: +headers["x-bz-upload-timestamp"],
		customMetadata
	};
}

export async function requireObject(key: string) {
	await headObject(key);
}

export async function objectExists(key: string): Promise<boolean> {
	try {
		await headObject(key);
	} catch (error) {
		if (error instanceof NotFound) return false;
		throw new Error("Failed to head object: " + error);
	}

	return true;
}

export async function deleteObject(key: string) {
	console.debug("Deleting object from server: ", key);
	const b2 = getBackblaze();
	const storage = Storage.getInstance(b2);

	return await storage.send("b2_hide_file", {
		method: "POST",
		body: {
			bucketId: requireBucketId(b2.config.defaultBucket),
			fileName: key,
		}
	});
}

export function uploadObject(key: string, blob: StreamingBlobPayloadInputTypes, metadata: UploadParams["metadata"]) {
	const b2 = getBackblaze();
	const storage = Storage.getInstance(b2);

	const upload = new Upload(storage, {
		bucket: b2.config.defaultBucket,
		key: key,
		body: blob,
		metadata,
	});

	let stateHandler: ProgressListener | undefined;
	let errorHandler: ErrorListener | undefined;
	return new Promise((res, rej) => {
		stateHandler = ({ state }) => { if (state === "success") res(null); };
		errorHandler = (err) => { rej(err); };

		upload.on("state_changed", stateHandler);
		upload.on("failed", errorHandler);
	}).finally(() => {
		if (stateHandler) upload.off("state_changed", stateHandler);
		if (errorHandler) upload.off("failed", errorHandler);
	});
}

export function uploadObjectResumable(key: string, blob: StreamingBlobPayloadInputTypes, metadata: UploadParams["metadata"]) {
	const b2 = getBackblaze();
	const storage = Storage.getInstance(b2);

	return new Upload(storage, {
		bucket: b2.config.defaultBucket,
		key: key,
		body: blob,
		metadata,
	});
}

export type FileMetadata = {
	key: string,
	id: string,
	size: number,
	contentType: string,
	contentDisposition: string,
	sha1Checksum: string,
	uploadTimestamp: number,
	customMetadata?: Record<Lowercase<string>, string> & { // keys should be in snake_case
		"src_last_modified_millis"?: string,
	},
};
