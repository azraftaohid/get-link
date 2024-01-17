import { HttpRequest } from "@smithy/protocol-http";
import { StreamingBlobPayloadInputTypes } from "@smithy/types";
import EventEmitter from "events";
import { AppHttpHandler } from "../AppHttpHandler";
import { B2GetUploadPartUrlResponse, B2GetUploadUrlResponse, B2StartLargeFileResponse, B2UploadFileOptions, B2UploadPartResponse } from "../backblaze";
import { StorageError } from "../errors/StorageError";
import { FileMetadata, Storage, requireBucketId } from "../storage";
import { percEncoded } from "../strings";
import { byteLength } from "./bytelength";
import { getChunk } from "./chunker";

export class Upload extends EventEmitter {
	public static MIN_PART_SIZE = 5 * Math.pow(2, 20);
	public static MAX_PARTS = 10000;

	private storage: Storage;
	private params: UploadParams;

	private totalBytes: number | undefined;
	private uploadedBytes: number;

	private partSize: number;

	private feed: AsyncGenerator<RawDataPart, void, undefined> | undefined;

	private _state: UploadState;
	private aborter: AbortController;

	private getUploadUrlPromise: Promise<B2GetUploadUrlResponse> | undefined;
	private uploadOptions: { url: string, authToken: string } | undefined;

	private startLargeFilePromise: Promise<B2StartLargeFileResponse> | undefined;
	private fileId: string | undefined | null;

	private partUploadOptionsArray: { 
		result?: { url: string, authToken: string }, 
		getUrlPromise?: Promise<B2GetUploadPartUrlResponse> 
	}[] | undefined;

	private multipart: boolean;
	private partSha1Array: string[];

	private pendings: Set<RawDataPart>;
	private locks: Set<RawDataPart>;

	private maxParallel: number;
	private active: number;

	constructor(storage: Storage, params: UploadParams) {
		super({});

		console.debug(`Initializing uploader [key: ${params.key}; bucket: ${params.bucket}]`);

		this.storage = storage;
		this.params = params;

		this.totalBytes = byteLength(params.body);
		this.uploadedBytes = 0;

		this.partSize = Math.max(Upload.MIN_PART_SIZE, Math.ceil((this.totalBytes ?? 0) / Upload.MAX_PARTS));

		this._state = "none";
		this.aborter = new AbortController();

		this.multipart = true;
		this.partSha1Array = [];
		this.pendings = new Set();
		this.locks = new Set();

		this.maxParallel = 4;
		this.active = 0;
	}

	private setState(state: UploadState): boolean {
		if (this._state === state) return false;
		this._state = state;

		this.emit("state_changed", this.makeProgress());
		return true;
	}

	public getState() {
		return this._state;
	}

	/**
	 * @see https://github.com/backblaze-b2-samples/b2-browser-upload/blob/main/public/javascripts/index.js#L13
	 */
	private async createSha1Hash(body: Buffer) {
		const hashBuffer = await crypto.subtle.digest("SHA-1", body);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	private requestIsOfThisUpload(expectedUrl: URL, req: HttpRequest) {
		return expectedUrl.protocol === req.protocol &&
			expectedUrl.hostname === req.hostname &&
			expectedUrl.protocol === req.protocol &&
			expectedUrl.pathname === req.path;
	}

	private withInfoPrefix(src: Record<string, string>) {
		const res: Record<string, string> = {};
		Object.entries(src).forEach(([key, value]) => value !== undefined && (res[`x-bz-info-${key}`] = value));

		return res;
	}

	private async uploadAsWhole(dataPart: RawDataPart) {
		console.debug("Uploading as whole.");

		if (!this.uploadOptions) {
			if (!this.getUploadUrlPromise) this.getUploadUrlPromise = this.storage.send("b2_get_upload_url", {
				method: "GET",
				query: {
					bucketId: requireBucketId(this.params.bucket),
				}
			});

			let res: B2GetUploadUrlResponse;
			try {
				res = await this.getUploadUrlPromise;
			} catch (error) {
				throw new StorageError("storage:get-upload-url-failed", "Unable to get regular file upload URL", error);
			}

			if (!res.uploadUrl || !res.authorizationToken)
				throw new StorageError("storage:invalid-upload-options", "Get upload URL response did not include "
				+ "regular file upload URL or auth token.");

			this.uploadOptions = { url: res.uploadUrl, authToken: res.authorizationToken };
		}
		if (this.getState() !== "running") return;

		let sha1Hash: string;
		try {
			sha1Hash = await this.createSha1Hash(dataPart.data);
		} catch (error) {
			throw new StorageError("storage:create-sha1-hash-error", "Unable to create SHA-1 hash of body", error);
		}
		if (this.getState() !== "running") return;

		if (this.locks.has(dataPart)) return;
		this.locks.add(dataPart);

		const uploadUrlInstance = new URL(this.uploadOptions.url);
		const progressHandler = (evt: ProgressEvent, req: HttpRequest) => {
			if (!this.requestIsOfThisUpload(uploadUrlInstance, req)) {
				return;
			}

			this.totalBytes = evt.total;
			this.uploadedBytes = evt.loaded;

			this.emit("progress", this.makeProgress());
		};

		const reqHandler = this.storage.requestHandler;
		if (reqHandler instanceof AppHttpHandler) {
			console.debug("Request handler is an AppHttpHandler. Registering progress handler.");
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		const partSize = byteLength(dataPart.data);
		try {
			await this.storage.send("b2_upload_file", {
				url: this.uploadOptions.url,
				method: "POST",
				headers: {
					"Authorization": this.uploadOptions.authToken,
					"X-Bz-File-Name": percEncoded(this.params.key),
					"Content-Type": this.params.metadata.contentType || "b2/x-auto",
					"Content-Length": (partSize || 0).toString(),
					"X-Bz-Content-Sha1": sha1Hash,
					...(this.params.metadata.contentDisposition && { "X-Bz-Info-b2-content-disposition": percEncoded(this.params.metadata.contentDisposition) }),
					...(this.params.metadata.customMetadata && this.withInfoPrefix(this.params.metadata.customMetadata))
				},
				body: this.params.body,
			}, { abortSignal: this.aborter.signal, });
		} catch (error) {
			throw new StorageError("storage:put-failed", "Unable to upload data part as whole", error);
		} finally {
			this.locks.delete(dataPart);
			if (reqHandler instanceof AppHttpHandler) {
				reqHandler.off("xhrUploadProgress", progressHandler);
			}
		}

		this.pendings.delete(dataPart);
		console.debug("Data part uploaded as whole.");

		if (!(reqHandler instanceof AppHttpHandler)) {
			this.uploadedBytes += partSize || 0;
			this.emit("progress", this.makeProgress());
		}
	}

	private async uploadAsPart(dataPart: RawDataPart) {
		console.debug("Uploading data part: ", dataPart.partNumber);

		if (!this.fileId) {
			if (!this.startLargeFilePromise) this.startLargeFilePromise = this.storage.send("b2_start_large_file", {
				method: "POST",
				body: {
					bucketId: requireBucketId(this.params.bucket),
					fileName: this.params.key,
					contentType: this.params.metadata.contentType || "b2/x-auto",
					fileInfo: {
						...(this.params.metadata.contentDisposition && { "b2-content-disposition": this.params.metadata.contentDisposition }),
						...this.params.metadata.customMetadata,
					}
				}
			});

			try {
				const res = await this.startLargeFilePromise;
				this.fileId = res.fileId;
			} catch (error) {
				throw new StorageError("storage:multipart-init-failed", "Large file upload start failed", error);
			}

			if (!this.fileId) throw new StorageError("storage:no-multipart-file-id", "Start large file response did not include file ID");
		}
		if (this.getState() !== "running") return;

		let uploadOptions = (this.partUploadOptionsArray || (this.partUploadOptionsArray = []))[dataPart.partNumber];
		if (!uploadOptions) uploadOptions = this.partUploadOptionsArray[dataPart.partNumber] = { };
		if (!uploadOptions.result) {
			if (!uploadOptions.getUrlPromise) uploadOptions.getUrlPromise = this.storage.send("b2_get_upload_part_url", {
				method: "GET",
				query: {
					fileId: this.fileId,
				}
			});

			let res: B2GetUploadPartUrlResponse;
			try {
				res = await uploadOptions.getUrlPromise;
			} catch (error) {
				throw new StorageError("storage:get-part-upload-url-failed", "Unable to get upload URL for large file part", error);
			}

			if (!res.uploadUrl || !res.authorizationToken) throw new StorageError("storage:invalid-part-upload-options",
				"Get part upload url response did not include upload URL or auth token.");

			uploadOptions.result = { url: res.uploadUrl, authToken: res.authorizationToken };
		}
		if (this.getState() !== "running") return;
		
		let sha1Hash: string;
		try {
			sha1Hash = await this.createSha1Hash(dataPart.data);
		} catch (error) {
			throw new StorageError("storage:create-sha1-hash-error", "Unable to create SHA-1 hash of part " + dataPart.partNumber, error);
		}
		if (this.getState() !== "running") return;

		if (this.locks.has(dataPart) || this.getState() !== "running") return;
		this.locks.add(dataPart);

		const partSize = byteLength(dataPart.data);

		let calculatedBytes = 0;
		const uploadUrlInstance = new URL(uploadOptions.result.url);
		const progressHandler = (evt: ProgressEvent, req: HttpRequest) => {
			const reqPartNumber = Number(req.headers["X-Bz-Part-Number"]) || "-1";
			if (!this.requestIsOfThisUpload(uploadUrlInstance, req) || reqPartNumber !== dataPart.partNumber) {
				return;
			}

			if (evt.total && partSize) {
				this.uploadedBytes += evt.loaded - calculatedBytes;
				calculatedBytes = evt.loaded;
			}

			this.emit("progress", this.makeProgress());
		};

		const reqHandler = this.storage.requestHandler;
		if (reqHandler instanceof AppHttpHandler) {
			console.debug("Request handler is an AppHttpHandler. Registering progress handler.");
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		let partResult: B2UploadPartResponse;
		try {
			partResult = await this.storage.send("b2_upload_part", {
				url: uploadOptions.result.url,
				method: "POST",
				headers: {
					"Authorization": uploadOptions.result.authToken,
					"X-Bz-Part-Number": dataPart.partNumber.toString(),
					"Content-Length": (partSize || 0).toString(),
					"X-Bz-Content-Sha1": sha1Hash,
				},
				body: dataPart.data,
			}, { abortSignal: this.aborter.signal });

			if (!partResult.contentSha1) {
				throw new StorageError("storage:part-sha1-checksum-missing", 
					`SHA-1 checksum of part ${dataPart.partNumber} is missing in upload part response. `
					+ "Make sure that the 'etag' and/or 'X-Bz-Content-Sha1' header is exposed to the client "
					+ "application via CORS rules.", null);
			}
		} catch (error) {
			throw new StorageError("storage:upload-part-failed", "Unable to upload data part " + dataPart.partNumber, error);
		} finally {
			this.locks.delete(dataPart);
			if (reqHandler instanceof AppHttpHandler) {
				reqHandler.off("xhrUploadProgress", progressHandler);
			}
		}

		this.pendings.delete(dataPart);
		console.debug("Data part upload complete: " + dataPart.partNumber);

		if (!(reqHandler instanceof AppHttpHandler)) {
			if (partSize) this.uploadedBytes += partSize;
			this.emit("progress", this.makeProgress());
		}

		this.partSha1Array[dataPart.partNumber - 1] = sha1Hash;
	}

	private async handleDataPart(dataPart: RawDataPart) {
		if (this.locks.has(dataPart)) {
			console.debug(`Data part ${dataPart.partNumber} is locked. Refusing to handle.`);
			return;
		}

		if (dataPart.partNumber === 1 && dataPart.lastPart) {
			this.multipart = false;
			await this.uploadAsWhole(dataPart);
		} else {
			await this.uploadAsPart(dataPart);
		}
	}

	public start() {
		const current = this.getState();
		if (!(current === "none" || current === "paused")) return false;
		if (!this.setState("running")) return false;

		const tasks: Promise<unknown>[] = [];
		for (let i = 0, lim = this.maxParallel - this.active; i < lim; i++) {
			tasks.push(this._start().finally(() => this.active--));
			this.active++;
		}

		Promise.all(tasks).then(() => {
			if (this.getState() !== "running" || this.pendings.size) return;
			return this.finish();
		}).catch(error => {
			this.setState("error");
			this.emit("failed", error instanceof StorageError 
				? error 
				: new StorageError("storage:unknown-error", "Upload failed with unidentified error", error));
		});
		return true;
	}

	private async _start(): Promise<void> {
		if (!this.feed) {
			this.feed = getChunk(this.params.body, this.partSize);
			console.debug("Feed prepared.");
		}

		for (const dataPart of Array.from(this.pendings)) {
			console.debug("Handling pending data part.");
			await this.handleDataPart(dataPart);
		}

		if (this.getState() !== "running") return;
		for (let o = await this.feed.next(); !o.done; o = await this.feed.next()) {
			const dataPart = o.value;
			this.pendings.add(dataPart);

			if (this.getState() !== "running") return;
			await this.handleDataPart(dataPart);
			if (this.getState() !== "running") return;
		}
	}

	private async finish() {
		if (this.multipart) {
			console.debug("Completing multipart upload.");
			if (!this.fileId) throw new StorageError("storage:no-multipart-file-id", "File ID not found before finishing");

			try {
				await this.storage.send("b2_finish_large_file", {
					method: "POST",
					body: {
						fileId: this.fileId,
						partSha1Array: this.partSha1Array,
					}
				});
			} catch (error) {
				throw new StorageError("storage:multipart-finalize-failed", "Unable to complete multipart upload", error);
			}
		}

		this.setState("success");
	}

	public pause() {
		const current = this.getState();
		if (!(current === "none" || current === "running")) return false;
		
		return this.setState("paused");
	}

	public cancel() {
		const current = this.getState();
		if (!(current === "none" || current === "running" || current === "paused" || current === "error")) return false;

		if (current !== "error") {
			this.aborter.abort();
			this.setState("canceled");
			this.emit("failed", new StorageError("storage:upload-canceled", "Upload was aborted by user", null));
		}

		if (this.startLargeFilePromise) {
			console.debug("Multipart upload was in progress. Attempting to abort...");

			this.startLargeFilePromise.then(async output => {
				console.debug("Create multipart upload command finished. Sending abort request...");
				if (!output.fileId) throw new StorageError("storage:no-multipart-file-id", "Start large file response did not "
					+ "include file ID on cancel");
				
				await this.storage.send("b2_cancel_large_file", {
					method: "POST",
					body: {
						fileId: output.fileId
					}
				}).then(() => {
					console.debug("Multipart upload aborted successfully.");
				}).catch(err => {
					console.warn("Multipart create or abort failed: ", err);
				});
			});
		}

		return true;
	}

	private makeProgress(): UploadProgress {
		return {
			state: this.getState(),
			totalBytes: this.totalBytes,
			uploadedBytes: this.uploadedBytes,
		};
	}

	on<K extends keyof ListenerMapping>(eventName: K, listener: ListenerMapping[K]): this {
		return super.on(eventName, listener);
	}

	off<K extends keyof ListenerMapping>(eventName: K, listener: ListenerMapping[K]): this {
		return super.off(eventName, listener);
	}

	emit<K extends keyof ListenerMapping>(eventName: K, ...args: Parameters<ListenerMapping[K]>): boolean {
		console.debug("Emitting upload event: " + eventName);
		return super.emit(eventName, ...args);
	}

	removeAllListeners<K extends keyof ListenerMapping>(event?: K): this {
		return super.removeAllListeners(event);
	}
}

export type ListenerMapping = {
	"state_changed": ProgressListener,
	"progress": ProgressListener,
	"failed": ErrorListener,
}

export type UploadState = "none" | "running" | "paused" | "error" | "success" | "canceled";
export type ProgressListener = (progress: UploadProgress) => void;
export type ErrorListener = (error: StorageError) => void;
export type BodyDataTypes = B2UploadFileOptions["body"];

export interface RawDataPart {
	partNumber: number;
	data: Buffer;
	lastPart?: boolean;
}

export type FileUploadMetadata = Partial<Pick<FileMetadata, "contentType" | "contentDisposition" | "customMetadata">>;

export interface UploadParams {
	bucket: string,
	key: string,
	body: StreamingBlobPayloadInputTypes,
	metadata: FileUploadMetadata,
}

export interface UploadProgress {
	totalBytes: number | undefined,
	uploadedBytes: number,
	state: UploadState,
}
