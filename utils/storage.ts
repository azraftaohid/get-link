import { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpHandlerOptions, RequestHandlerOutput, StreamingBlobPayloadInputTypes } from "@smithy/types";
import { Auth, User, getIdTokenResult } from "firebase/auth";
import { IncomingMessage } from "http";
import { Readable } from "stream";
import { AppHttpHandler } from "./AppHttpHandler";
import { storageConfig } from "./configs";
import { now } from "./dates";
import { NotFound } from "./errors/NotFound";
import { StorageError } from "./errors/StorageError";
import { makeDirectLink } from "./files";
import { getHttpEndpoint } from "./functions";
import { Region } from "./region";
import { toText } from "./strings";
import { ErrorListener, ProgressListener, Upload, UploadParams } from "./upload/Upload";

function requiresAuthToken(api: keyof StorageApis) {
	const requiringApis: (keyof StorageApis)[] = [
		"cancel_large_file", "finish_large_file", "start_large_file", "upload_file", "upload_part", "delete_file",
	];

	return requiringApis.includes(api);
}

export function getStorage() {
	return Storage.getInstance();
}

export class Storage {
	private static instance: Storage | undefined;

	public readonly requestHandler: AppHttpHandler;

	public readonly apiUrl: string;
	public readonly fileUrl: string;
	public readonly defaultBucket: string;

	// key used to identify user in the storage service; obtained from gcloud func storage-api
	private storageKey: string | undefined;
	private getStorageKeyPromise: Promise<string> | undefined;

	private boundAuth: Auth[];

	private constructor(config: StorageConfig) {
		this.requestHandler = AppHttpHandler.getInstance();

		this.apiUrl = config.apiUrl;
		this.fileUrl = config.fileUrl;
		this.defaultBucket = config.defaultBucket;

		this.boundAuth = [];
	}

	public static getInstance() {
		if (!Storage.instance) Storage.instance = new Storage(storageConfig);
		return Storage.instance;
	}

	private async getAuthToken() {
		if (!this.storageKey) {
			if (!this.getStorageKeyPromise) {
				throw new StorageError("storage:not-signed-in", "Auth token requires user to be signed in. If the user is "
				+ "signed in, maybe the auth instance is not bound to this storage instance.", null);
			}

			this.storageKey = await this.getStorageKeyPromise;
		}

		return this.storageKey;
	}

	private async sign<K extends keyof StorageApis>(api: K, _options: StorageApis[K][0]): Promise<HttpRequest> {
		console.log("Signing '" + api + "' API call request");
		const options = _options as StorageApiOptions;

		const url = new URL(options.url ? options.url : `${this.apiUrl}/v1/${api}`);

		let body: unknown;
		let contentType: string | undefined;
		if (!options.body) body = undefined;
		else if (options.body instanceof Blob || options.body instanceof Uint8Array
			|| options.body instanceof ReadableStream || options.body instanceof Buffer
			|| options.body instanceof Readable) { // acceptable static/streaming body types
			body = options.body;
		} else {
			// must be strigified; otherwise will be sent as [object Object];
			body = JSON.stringify(options.body);
			contentType = "application/json";
		}

		const request = new HttpRequest({
			method: options.method,
			protocol: url.protocol,
			hostname: url.hostname,
			...(url.port && { port: +url.port }),
			path: url.pathname,
			query: options.query,
			body: body,
		});

		if (contentType) request.headers["Content-Type"] = contentType;
		
		// set headers from options to the request object
		// allow content-type header to be overridden if defined explicitly in options#headers
		if (options.headers) {
			Object.entries(options.headers).forEach(([key, value]) => request.headers[key] = value);
		}

		// do not override authorization header if explicitly provided; use case: upload file requests
		if (!("Authorization" in request.headers) && requiresAuthToken(api)) {
			const authToken = await this.getAuthToken();
			request.headers["Authorization"] = authToken;
		}

		return request;
	}

	private static isRetriable(req: HttpRequest) {
		return req.method === "GET" || req.method === "HEAD" || typeof req.body === "string";
	}

	private static async parseBody(body: unknown): Promise<Record<string, unknown> | undefined> {
		let result: Record<string, unknown> | undefined;
		// response#body can be: Blob, ReadableStream, http.IncomingMessage
		// see: https://github.com/aws/aws-sdk-js-v3/blob/main/packages/xhr-http-handler/src/xhr-http-handler.ts#L182C1-L193C18
		// see: https://github.com/aws/aws-sdk-js-v3/blob/main/packages/xhr-http-handler/src/xhr-http-handler.ts#L182C1-L193C18
		// see: https://github.com/smithy-lang/smithy-typescript/blob/main/packages/node-http-handler/src/node-http-handler.ts#L134C1-L144C10
		if (body instanceof ReadableStream || body instanceof IncomingMessage) {
			try {
				const txt = await toText(body);
				if (txt) result = JSON.parse(txt);
			} catch (error) {
				throw new StorageError("storage:json-parse-error", "Response#body can not be parsed as JSON", error);
			}
		} else if (body instanceof Blob) {
			result = { blob: body };
		}

		return result;
	}

	public async send<K extends keyof StorageApis>(
		api: K,
		options: StorageApis[K][0],
		params: (HttpHandlerOptions & { maxRetries?: number }) = { requestTimeout: 3000 }
	): Promise<StorageApis[K][1]> {
		const request = await this.sign(api, options);

		const startTime = now();
		let result: RequestHandlerOutput<HttpResponse> | undefined;
		for (let attempt = 1, limit = Storage.isRetriable(request) ? 3 : params.maxRetries ?? 1; ; attempt++) {
			console.debug(`Sending request to '${api}' API endpoint; attempt: ${attempt}/${limit}`);
			try {
				result = await this.requestHandler.handle(request, params);
				if (result.response.statusCode !== 504 && result.response.statusCode !== 502) break;

				const body = await Storage.parseBody(result.response.body) as RequestFailedResponse | undefined;
				throw new Error(`Gateway error [status: ${body?.status}; code: ${body?.code}; message: ${body?.message}]`);
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") throw error;
				if (attempt >= limit) throw error;
			}
		}
		console.debug(`API endpoint (${api}) response received [took: ${now() - startTime}ms]`);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const body: any = await Storage.parseBody(result.response.body);
		switch (result.response.statusCode) {
			case 200: return { ...result.response.headers, ...body };
			case 404: throw new NotFound();
			default: 
				throw new StorageError("storage:api-error", `status: ${result.response.statusCode}; reason: ${JSON.stringify(body)}`, null);
		}
	}

	public bindAuth(auth: Auth) {
		if (this.boundAuth.indexOf(auth) !== -1) return;
		this.boundAuth.push(auth);

		auth.authStateReady().then(async () => {
			const user = auth.currentUser;
			if (user) {
				this.getStorageKeyPromise = getStorageKey(user);
				this.storageKey = await this.getStorageKeyPromise;
			} else {
				this.storageKey = undefined;
			}
		}).catch(error => {
			console.error("Storage key update failed on post auth state settle: ", error);
		});

		let thenKey: string | undefined;
		auth.beforeAuthStateChanged(async (user) => {
			console.debug("Auth state may change, updating storage key.");
			thenKey = this.storageKey;
			if (user) {
				this.getStorageKeyPromise = getStorageKey(user);
				this.storageKey = await this.getStorageKeyPromise;
			} else {
				this.storageKey = undefined;
			}
		}, () => {
			console.debug("Auth state change aborted, reverting storage key.");
			this.storageKey = thenKey;
		});
	}
}

export async function getStorageKey(user: User | null): Promise<string> {
	console.debug("Getting storage key of user");
	if (!user) throw new Error("User must be signed in with Firebase to get storage authorization.");

	const idTokenResult = await getIdTokenResult(user, true);

	const key = idTokenResult.claims.storageKey;
	if (typeof key === "string") return key;

	console.debug("Getting storage authorization from server...");
	const idToken = idTokenResult.token;

	const url = getHttpEndpoint("storage/get_authorization", Region.ASIA_SOUTH_1);
	const response = await fetch(url, {
		headers: { "Authorization": `Bearer ${idToken}` },
		method: "GET",
	});

	let data: { authKey?: string };
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(`Get storage authorization failed with code: ${response.status} and cause data could not be parsed into JSON.`);
	}

	if (response.status !== 200) {
		throw new Error(`Get storage authorization failed with code: ${response.status}: ${JSON.stringify(data)}`);
	}

	if (!data.authKey) {
		throw new Error("Get storage authorization failed with cause authKey is not defined in the response data");
	}

	return data.authKey;
}

export function getDownloadURL(fileName: string): string {
	return makeDirectLink(fileName);
}

export async function headObject(fileName: string) {
	const storage = getStorage();
	return await storage.send("head_file", {
		url: getDownloadURL(fileName),
		method: "HEAD",
	});
}

export async function getMetadata(fileName: string): Promise<FileMetadata> {
	const storage = getStorage();
	return storage.send("get_file_metadata", {
		method: "GET",
		query: {
			bucket: storage.defaultBucket,
			fileName
		},
	});
}

export async function requireObject(fileName: string) {
	await headObject(fileName);
}

export async function objectExists(fileName: string): Promise<boolean> {
	try {
		await headObject(fileName);
	} catch (error) {
		if (error instanceof NotFound) return false;
		throw new Error("Failed to head object: " + error);
	}

	return true;
}

export async function deleteObject(fileName: string) {
	const storage = getStorage();

	return await storage.send("delete_file", {
		method: "POST",
		body: {
			bucket: storage.defaultBucket,
			fileName: fileName,
		}
	});
}

export function uploadObject(fileName: string, blob: StreamingBlobPayloadInputTypes, metadata: UploadParams["metadata"]) {
	const storage = getStorage();

	const upload = new Upload(storage, {
		bucket: storage.defaultBucket,
		fileName: fileName,
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
		upload.start();
	}).finally(() => {
		if (stateHandler) upload.off("state_changed", stateHandler);
		if (errorHandler) upload.off("failed", errorHandler);
	});
}

/**
 * Initializes an uploader that can be resumed or paused. Invoking this method does not start the uploader automatically.
 * @returns The uploader instance.
 */
export function uploadObjectResumable(fileName: string, blob: StreamingBlobPayloadInputTypes, metadata: UploadParams["metadata"]) {
	const storage = getStorage();

	return new Upload(storage, {
		bucket: storage.defaultBucket,
		fileName: fileName,
		body: blob,
		metadata,
	});
}

export interface StorageConfig {
	apiUrl: string,
	fileUrl: string,
	defaultBucket: string,
}

export type FileMetadata = {
	bucket: string,
	fileName: string,
	fileId: string,
	size: string,
	mimeType: string,
	contentDisposition: string | undefined | null,
	sha1Checksum: string,
	uploadTimestamp: string,
	customMetadata: Record<Lowercase<string>, string> & { // keys should be in snake_case
		"src_last_modified_millis"?: string,
	}
};

export interface StorageApis {
	"cancel_large_file": [CancelLargeFileOptions, CancelLargeFileResposne],
	"finish_large_file": [FinishLargeFileOptions, FinishLargeFileResponse],
	"start_large_file": [StartLargeFileOptions, StartLargeFileResponse],
	"upload_file": [UploadFileOptions, UploadFileReponse],
	"upload_part": [UploadPartOptions, UploadPartResponse],
	"get_file_metadata": [GetFileMetadataOptions, GetFileMetadataResponse],
	"delete_file": [DeleteFileOptions, DeleteFileResponse],
	"head_file": [HeadFileOptions, HeadFileResponse],
}

export interface RequestFailedResponse {
	status: number,
	code: string,
	message?: string,
}

export interface StorageApiOptions {
	url?: string,
	method: "HEAD" | "GET" | "POST" | "PUT",
	headers?: Record<string, string>,
	query?: Record<string, string>,
	body?: unknown,
}

export interface HeadFileOptions {
	method: "HEAD",
	url: string,
}

export interface HeadFileResponse {
	"x-bz-file-name": string,
	"x-bz-file-id": string,
	"x-bz-content-sha1": string,
	"x-bz-upload-timestamp": string,
	"content-disposition": string,
	"content-type": string,
	"content-length": string,
	"x-bz-info-src_last_modified_millis": string,
	[key: `x-bz-info-${string}`]: string,
}

export interface GetFileMetadataOptions {
	method: "GET",
	query: {
		bucket: string,
		fileName: string,
	}
}

export type GetFileMetadataResponse = FileMetadata;

export interface UploadFileOptions {
	method: "POST",
	headers: {
		"x-gl-bucket": string,
		"X-Bz-File-Name": string,
		"Content-Type": string, // use "b2/x-auto" for auto detection
		"Content-Length": string,
		"X-Bz-Content-Sha1": string,
		"X-Bz-Info-b2-content-disposition"?: string,
		[key: `X-Bz-Info-${string}`]: string | undefined,
	},
	body: StreamingBlobPayloadInputTypes,
}

export interface UploadFileReponse {
	accountId: string,
	action: "start" | "upload" | "hide" | "folder",
	bucketId: string,
	contentLength: string,
	contentSha1: string | null,
	contentMd5: string | null,
	contentType: string | null,
	fileId: string | null,
	fileInfo: Record<string, string> | undefined,
	fileName: string,
	uploadTimestamp: number,
}

export interface StartLargeFileOptions {
	method: "POST",
	body: {
		bucket: string,
		fileName: string,
		contentType: string,
		fileInfo?: Record<string, string>,
		customUploadTimestamp?: string, // base 10 number of milliseconds since midnight, January 1st, 1970 UTC
	}
}

export interface StartLargeFileResponse {
	accountId: string,
	action: "start" | "upload" | "hide" | "folder",
	bucketId: string,
	contentLength: 0,
	contentSha1: "none",
	contentMd5: null,
	contentType: string | null,
	fileId: string | null,
	fileInfo: Record<string, string> | undefined, // set b2-content-disposition, and custom info
	fileName: string,
}

export interface UploadPartOptions {
	method: "POST",
	headers: {
		"x-gl-file-id": string,
		"X-Bz-Part-Number": string,
		"Content-Length": string,
		"X-Bz-Content-Sha1": string,
	},
	body: StreamingBlobPayloadInputTypes,
}

export interface UploadPartResponse {
	fileId: string,
	partNumber: number,
	contentLength: number,
	contentSha1: string,
	contentMd5: string | null,
	uploadTimestamp: number,
}

export interface FinishLargeFileOptions {
	method: "POST",
	body: {
		fileId: string,
		partSha1Array: string[],
	},
}

export interface FinishLargeFileResponse {
	accountId: string,
	action: "upload",
	bucketId: string,
	contentLength: number,
	contentSha1: "none",
	contentMd5: null,
	contentType: string | null,
	fileId: string | null,
	fileInfo: Record<string, string> | undefined,
	fileName: string,
	uploadTimestamp: number,
}

export interface CancelLargeFileOptions {
	method: "POST",
	body: {
		fileId: string,
	}
}

export interface CancelLargeFileResposne {
	fileId: string,
	accountId: string,
	bucketId: string,
	fileName: string,
}

export interface DeleteFileOptions {
	method: "POST",
	body: {
		bucket: string,
		fileName: string,
	}
}

export interface DeleteFileResponse {
	fileId: string,
	fileName: string,
}
