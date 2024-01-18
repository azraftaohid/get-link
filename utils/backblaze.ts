import { HttpRequest } from "@smithy/protocol-http";
import { StreamingBlobPayloadInputTypes } from "@smithy/types";
import { Auth, User, getIdTokenResult } from "firebase/auth";
import { Readable } from "stream";
import util from "util";
import { getAppApiUrl } from "./appApi";
import { getB2Config } from "./configs";
import { getHttpEndpoint } from "./functions";
import { Region } from "./region";

class B2MalformedResponse extends Error { };

function requiresAuthToken(api: keyof B2ApiTypes) {
	const requiringApis: (keyof B2ApiTypes)[] = [
		"b2_cancel_large_file", "b2_finish_large_file", "b2_get_upload_part_url", "b2_get_upload_url",
		"b2_start_large_file", "b2_upload_file", "b2_upload_part", "delete_file"
	];

	return requiringApis.includes(api);
}

export class Backblaze {
	private static instances: Record<string, Backblaze>;

	public readonly config: Required<BackblazeConfig>;
	public readonly apiUrl: string;
	private readonly authUrl: string;
	public readonly fileUrl: string;

	private credential: B2Credential;
	private authToken: string | undefined;
	private authorizationPromise: Promise<string> | undefined;
	
	private boundAuth: Auth[];

	private constructor(config: BackblazeConfig) {
		if (!(
			config.apiUrl && config.authUrl && config.fileUrl && config.defaultBucket && config.defaultAppKey &&
			config.defaultAppKey && config.defaultAppKeyId
		)) {
			throw new Error("Required BackblazeConfig props are missing.");
		}

		this.config = { ...config } as Required<BackblazeConfig>;

		this.apiUrl = config.apiUrl;
		this.authUrl = config.authUrl;
		this.fileUrl = config.fileUrl;
		
		this.credential = this.reformCredential();
		this.boundAuth = [];
	}

	public static getInstance(name = "[DEFAULT]", config = getB2Config()) {
		let instance = (Backblaze.instances || (Backblaze.instances = {}))[name];
		if (!instance) instance = Backblaze.instances[name] = new Backblaze(config);
		return instance;
	}

	public static resolveDefaultCredential(): B2Credential {
		let key: string | undefined;
		let keyId: string | undefined;
		if ((keyId = process.env.BACKBLAZE_APP_KEY_ID)) {
			key = process.env.BACKBLAZE_APP_KEY;
		} else if ((keyId = process.env.NEXT_PUBLIC_BACKBLAZE_APP_KEY_ID)) {
			key = process.env.NEXT_PUBLIC_BACKBLAZE_APP_KEY;
		}

		if (!(key && keyId)) throw new Error("Could not resolve Backblaze application key and/or key ID.");
		return { key, keyId };
	}

	public static resolveDefaultApiUrl() {
		return getAppApiUrl() + "/storage";
	}

	private static hasFailed<T>(res: Response, data: Partial<T> | Partial<B2RequestFailedResponse>): data is Partial<B2RequestFailedResponse> {
		return res.status !== 200 || ("status" in data && data.status !== 200);
	}

	private static async parseFetch<T>(fetchPromise: Promise<Response>, apiName: string): Promise<[Partial<T>, Response]> {
		let res: Response;
		try {
			res = await fetchPromise;
		} catch (error) {
			throw new Error(`B2 request fetch failed. [api: ${apiName}; cause: ${util.format(error)}]`);
		}

		let data: Partial<T> | Partial<B2RequestFailedResponse>;
		try {
			data = await res.json();
		} catch (error) {
			throw new Error(`Unable to parse response as JSON. [api: ${apiName}; cause: ${util.format(error)}]`);
		}

		if (Backblaze.hasFailed(res, data)) {
			throw new Error(`B2 request failed. [api: ${apiName}; status: ${res.status}; code: ${data.code}; message: ${data.message}]`);
		}

		return [data, res];
	}

	private createAuthorizationPromise() {
		return new Promise<string>((resolve, reject) => {
			const strCred = this.credential.keyId + ":" + this.credential.key;
			const req = fetch(this.authUrl + "/b2_authorize_account", {
				method: "GET",
				headers: {
					Authorization: `Basic ${typeof window !== "undefined" 
						? window.btoa(strCred) 
						: Buffer.from(strCred).toString("base64")}`,
				}
			});

			Backblaze.parseFetch<B2AuthorizeAccountResponse>(req, "authorize_account").then(([data]) => {
				const { authorizationToken } = data;
				if (!authorizationToken) throw new B2MalformedResponse("Invalid data received from B2 auth request.");
				
				resolve(authorizationToken);
			}).catch(error => {
				this.authorizationPromise = undefined;
				reject(error);
			});
		});
	}

	private async getAuthToken(): Promise<string> {
		if (this.authToken) return this.authToken;
		
		for (let attempt = 1; ; attempt++) {
			console.debug(`Getting auth token from server; attempt: ${attempt}/3`);
			if (!this.authorizationPromise) this.authorizationPromise = this.createAuthorizationPromise();
			try {
				this.authToken = await this.authorizationPromise;
				break;
			} catch (error) {
				if (attempt >= 3) throw error;
			}
		};

		return this.authToken;
	}

	public async sign<K extends keyof B2ApiTypes>(api: K, _options: B2ApiTypes[K][0]): Promise<HttpRequest> {
		console.log("Signing " + api + " request");
		const options = _options as B2NativeApiOptions;

		const url = new URL(`${this.apiUrl}/${api}`);
		let body: unknown;
		let contentType: string | undefined;
		if (!options.body) body = undefined;
		else if (options.body instanceof Blob || options.body instanceof Uint8Array
			|| options.body instanceof ReadableStream || options.body instanceof Buffer
			|| options.body instanceof Readable) {
			body = options.body;
		} else {
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

		if (options.headers) {
			Object.entries(options.headers).forEach(([key, value]) => request.headers[key] = value);
		}

		if (!("Authorization" in request.headers) && requiresAuthToken(api)) {
			const authToken = await this.getAuthToken();
			request.headers["Authorization"] = authToken;
		}

		if (options.url) {
			request.headers["x-gl-forward-url"] = options.url;
		}

		return request;
	}

	public getCredential() {
		return this.credential;
	}

	private reformCredential() {
		return {
			key: this.config.defaultAppKey,
			keyId: this.config.defaultAppKeyId,
		};
	}

	public bindAuth(auth: Auth) {
		if (this.boundAuth.indexOf(auth) !== -1) {
			return console.log(`B2 already bound to given auth instance [bound count: ${this.boundAuth.length}].`);
		}
		this.boundAuth.push(auth);

		auth.authStateReady().then(async () => {
			console.debug("Auth state settled, updating B2 credential");
			const user = auth.currentUser;
			if (user) this.credential = await getB2Credential(user);
			else this.credential = this.reformCredential();
		}).catch(error => {
			console.error("B2 credential update failed on post auth state settle: ", error);
		});

		let thenCredential: B2Credential;
		auth.beforeAuthStateChanged(async (user) => {
			console.debug("Auth state may change, updating B2 credential.");
			thenCredential = this.credential;
			if (user) this.credential = await getB2Credential(user);
			else this.credential = this.reformCredential();
		}, () => {
			console.debug("Auth state change aborted, reverting B2 credential.");
			this.credential = thenCredential;
		});
	}
}

export async function getB2Credential(user: User | null): Promise<B2Credential> {
	console.debug("Getting B2 credential of user");
	if (!user) throw new Error("User must be signed in with Firebase to get B2 authorization.");

	const idTokenResult = await getIdTokenResult(user, true);

	const keyId = idTokenResult.claims.b2KeyId;
	const key = idTokenResult.claims.b2Key;
	if (typeof keyId === "string" && typeof key === "string") return { key, keyId };

	console.debug("Getting B2 credential from server...");
	const idToken = idTokenResult.token;

	const url = getHttpEndpoint("storage/get-b2-authorization", Region.ASIA_SOUTH_1);
	const response = await fetch(url, {
		headers: {
			"Firebase-Authorization": `Bearer ${idToken}`,
		},
		method: "GET",
	});

	let data: { key?: string, keyId?: string, message?: string };
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(`Get storage authorization failed with code: ${response.status} and cause data could not be parsed into JSON.`);
	}

	if (response.status !== 200) {
		throw new Error(`Get storage authorization failed with code: ${response.status} and message ${data.message}`);
	}

	if (!data.key || !data.keyId) {
		throw new Error("Get storage authorization failed with cause app key and/or app key name is not defined in the response data");
	}

	return { keyId: data.keyId, key: data.key };
}

export interface BackblazeConfig {
	apiUrl?: string,
	authUrl?: string,
	fileUrl?: string,
	defaultBucket?: string,
	defaultAppKey?: string,
	defaultAppKeyId?: string,
}

export interface B2Credential {
	keyId: string,
	key: string,
}

export interface B2ApiTypes {
	"b2_cancel_large_file": [B2CancelLargeFileOptions, B2CancelLargeFileResposne],
	"b2_finish_large_file": [B2FinishLargeFileOptions, B2FinishLargeFileResponse],
	"b2_get_upload_part_url": [B2GetUploadPartUrlOptions, B2GetUploadPartUrlResponse],
	"b2_get_upload_url": [B2GetUploadUrlOptions, B2GetUploadUrlResponse],
	"b2_start_large_file": [B2StartLargeFileOptions, B2StartLargeFileResponse],
	"b2_upload_file": [B2UploadFileOptions, B2UploadFileReponse],
	"b2_upload_part": [B2UploadPartOptions, B2UploadPartResponse],
	"b2_head_file": [B2HeadFileOptions, B2HeadFileResponse],
	"delete_file": [B2DeleteFileOptions, B2DeleteFileResponse],
	"b2_delete_file_version": [B2DeleteFileVersionOptions, B2DeleteFileVersionResponse],
}

interface B2AuthorizeAccountResponse {
	accountId: string,
	authorizationToken: string,
	allowed: {
		capabilities: string[],
		bucketId: string,
		bucketName: string,
		namePrefix: string,
	},
	apiUrl: string,
	downloadUrl: string,
	recommendedPartSize: number,
	absoluteMinimumPartSize: number,
}

export interface B2RequestFailedResponse {
	status: number,
	code: string,
	message?: string,
}

export interface B2NativeApiOptions {
	url?: string,
	method: "HEAD" | "GET" | "POST" | "PUT",
	headers?: Record<string, string>,
	query?: Record<string, string>,
	body?: unknown,
}

export interface B2HeadFileOptions {
	method: "HEAD",
	url: string,
}

export interface B2HeadFileResponse {
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

export interface B2GetUploadUrlOptions {
	method: "GET",
	query: {
		bucketId: string,
	}
}

export interface B2GetUploadUrlResponse {
	bucketId: string,
	uploadUrl: string,
	authorizationToken: string,
}

export interface B2UploadFileOptions {
	url: string,
	method: "POST",
	headers: {
		"Authorization": string,
		"X-Bz-File-Name": string,
		"Content-Type": string, // use "b2/x-auto" for auto detection
		"Content-Length": string,
		"X-Bz-Content-Sha1": string,
		"X-Bz-Info-b2-content-disposition"?: string,
		[key: `X-Bz-Info-${string}`]: string | undefined,
	},
	body: StreamingBlobPayloadInputTypes,
}

export interface B2UploadFileReponse {
	acountId: string,
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

export interface B2StartLargeFileOptions {
	method: "POST",
	body: {
		bucketId: string,
		fileName: string,
		contentType: string,
		fileInfo?: Record<string, string>,
		customUploadTimestamp?: string, // base 10 number of milliseconds since midnight, January 1st, 1970 UTC
	}
}

export interface B2StartLargeFileResponse {
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

export interface B2GetUploadPartUrlOptions {
	method: "GET",
	query: {
		fileId: string,
	}
}

export interface B2GetUploadPartUrlResponse {
	fileId: string,
	uploadUrl: string,
	authorizationToken: string,
}

export interface B2UploadPartOptions {
	url: string,
	method: "POST",
	headers: {
		"Authorization": string,
		"X-Bz-Part-Number": string,
		"Content-Length": string,
		"X-Bz-Content-Sha1": string,
	},
	body: StreamingBlobPayloadInputTypes,
}

export interface B2UploadPartResponse {
	fileId: string,
	partNumber: number,
	contentLength: number,
	contentSha1: string,
	contentMd5: string | null,
	uploadTimestamp: number,
}

export interface B2FinishLargeFileOptions {
	method: "POST",
	body: {
		fileId: string,
		partSha1Array: string[],
	},
}

export interface B2FinishLargeFileResponse {
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

export interface B2CancelLargeFileOptions {
	method: "POST",
	body: {
		fileId: string,
	}
}

export interface B2CancelLargeFileResposne {
	fileId: string,
	accountId: string,
	bucketId: string,
	fileName: string,
}

export interface B2DeleteFileOptions {
	method: "POST",
	body: {
		bucketName: string,
		fileName: string,
	}
}

export interface B2DeleteFileResponse {
	fileId: string,
	fileName: string,
}

export interface B2DeleteFileVersionOptions {
	method: "POST",
	body: {
		fileId: string,
		fileName: string,
	}
}

export interface B2DeleteFileVersionResponse {
	fileId: string,
	fileName: string,
}
