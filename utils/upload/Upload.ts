import { HttpRequest } from "@smithy/protocol-http";
import { StreamingBlobPayloadInputTypes } from "@smithy/types";
import EventEmitter from "events";
import { AppHttpHandler } from "../AppHttpHandler";
import { StorageError } from "../errors/StorageError";
import { FileMetadata, StartLargeFileResponse, Storage, UploadFileOptions, UploadPartResponse } from "../storage";
import { percEncoded } from "../strings";
import { byteLength } from "./bytelength";
import { getChunk } from "./chunker";

export class Upload extends EventEmitter {
	public static readonly MIN_PART_SIZE = 5 * Math.pow(2, 20);
	public static readonly MAX_PART_SIZE = 95 * Math.pow(2, 20); // cf workers request body size limit -> 100 MB
	public static readonly MAX_PARTS = 10000;
	public static readonly MAX_PARALLEL = 4;

	private storage: Storage;
	public readonly params: UploadParams;

	private totalBytes: number | undefined;
	private uploadedBytes: number;

	private partSize: number;

	private feed: AsyncGenerator<RawDataPart, void, undefined> | undefined;

	private _state: UploadState;
	private aborter: AbortController;

	private startLargeFilePromise: Promise<StartLargeFileResponse> | undefined;
	private fileId: string | undefined | null;

	private multipart: boolean;
	private partSha1Array: string[];

	private pendings: Set<RawDataPart>;
	private locks: Set<RawDataPart>;

	private active: number;

	constructor(storage: Storage, params: UploadParams) {
		super({});

		console.debug(`Initializing uploader [key: ${params.fileName}; bucket: ${params.bucket}]`);

		this.storage = storage;
		this.params = params;

		this.totalBytes = byteLength(params.body);
		this.uploadedBytes = 0;

		const partSizeFactor = this.totalBytes ? Math.ceil(this.totalBytes / Upload.MAX_PART_SIZE) : 1;
		this.partSize = Math.max(Upload.MIN_PART_SIZE, Math.min(Upload.MAX_PART_SIZE, Math.ceil((this.totalBytes ?? 0) / partSizeFactor)));

		this._state = "none";
		this.aborter = new AbortController();

		this.multipart = true;
		this.partSha1Array = [];
		this.pendings = new Set();
		this.locks = new Set();

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

	private requestIsOfThisUpload(req: HttpRequest) {
		return (this.fileId && req.headers["x-gl-file-id"] === this.fileId) || (
			req.headers["x-gl-bucket"] === this.params.bucket &&
			req.headers["X-Bz-File-Name"] === percEncoded(this.params.fileName)
		);
	}

	private withInfoPrefix(src: Record<string, string>) {
		const res: Record<string, string> = {};
		Object.entries(src).forEach(([key, value]) => value !== undefined && (res[`x-bz-info-${key}`] = value));

		return res;
	}

	private async uploadAsWhole(dataPart: RawDataPart) {
		console.debug("Uploading as whole.");
		if (this.getState() !== "running") return;

		let sha1Hash: string;
		try {
			sha1Hash = await this.createSha1Hash(dataPart.data);
		} catch (error) {
			if (process.env.NODE_ENV === "development") sha1Hash = "do_not_verify";
			else throw new StorageError("storage:create-sha1-hash-error", "Unable to create SHA-1 hash of body", error);
		}
		if (this.getState() !== "running") return;

		if (this.locks.has(dataPart)) return;
		this.locks.add(dataPart);

		const progressHandler = (evt: ProgressEvent, req: HttpRequest) => {
			if (!this.requestIsOfThisUpload(req)) {
				return;
			}

			this.totalBytes = evt.total;
			this.uploadedBytes = evt.loaded;

			this.emit("progress", this.makeProgress());
		};

		const reqHandler = this.storage.requestHandler;
		if (reqHandler instanceof AppHttpHandler) {
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		const partSize = byteLength(dataPart.data);
		try {
			await this.storage.send("upload_file", {
				method: "POST",
				headers: {
					"x-gl-bucket": this.params.bucket,
					"X-Bz-File-Name": percEncoded(this.params.fileName),
					"Content-Type": this.params.metadata.mimeType || "b2/x-auto",
					"Content-Length": (partSize || 0).toString(),
					"X-Bz-Content-Sha1": sha1Hash,
					...(this.params.metadata.contentDisposition && { "X-Bz-Info-b2-content-disposition": percEncoded(this.params.metadata.contentDisposition) }),
					...(this.params.metadata.customMetadata && this.withInfoPrefix(this.params.metadata.customMetadata))
				},
				body: this.params.body,
			}, { abortSignal: this.aborter.signal, maxRetries: 3 });
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
		if (dataPart.data.length === 0) {
			console.warn("Empty data part: " + dataPart.partNumber);
			this.pendings.delete(dataPart);
			return;
		}

		if (!this.fileId) {
			if (!this.startLargeFilePromise) this.startLargeFilePromise = this.storage.send("start_large_file", {
				method: "POST",
				body: {
					bucket: this.params.bucket,
					fileName: this.params.fileName,
					contentType: this.params.metadata.mimeType || "b2/x-auto",
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
		
		let sha1Hash: string;
		try {
			sha1Hash = await this.createSha1Hash(dataPart.data);
		} catch (error) {
			if (process.env.NODE_ENV === "development") sha1Hash = "do_not_verify";
			else throw new StorageError("storage:create-sha1-hash-error", "Unable to create SHA-1 hash of part " + dataPart.partNumber, error);
		}
		if (this.getState() !== "running") return;

		if (this.locks.has(dataPart) || this.getState() !== "running") return;
		this.locks.add(dataPart);

		const partSize = byteLength(dataPart.data);

		let calculatedBytes = 0;
		const progressHandler = (evt: ProgressEvent, req: HttpRequest) => {
			const reqPartNumber = Number(req.headers["X-Bz-Part-Number"]) || "-1";
			if (!this.requestIsOfThisUpload(req) || reqPartNumber !== dataPart.partNumber) {
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
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		let partResult: UploadPartResponse;
		try {
			partResult = await this.storage.send("upload_part", {
				method: "POST",
				headers: {
					"x-gl-file-id": this.fileId,
					"X-Bz-Part-Number": dataPart.partNumber.toString(),
					"Content-Length": (partSize || 0).toString(),
					"X-Bz-Content-Sha1": sha1Hash,
				},
				body: dataPart.data,
			}, { abortSignal: this.aborter.signal, maxRetries: 3 });

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
		for (let i = 0, lim = Upload.MAX_PARALLEL - this.active; i < lim; i++) {
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
		if (!this.feed) this.feed = getChunk(this.params.body, this.partSize, (this.totalBytes ?? 0) / this.partSize > Upload.MAX_PARALLEL);

		for (const dataPart of Array.from(this.pendings)) {
			console.debug("Pending data part found.");
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
				await this.storage.send("finish_large_file", {
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
				if (!output.fileId) throw new StorageError("storage:no-multipart-file-id", "Start large file response did not "
					+ "include file ID on cancel");
				
				await this.storage.send("cancel_large_file", {
					method: "POST",
					body: {
						fileId: output.fileId
					}
				});
			}).then(() => {
				console.debug("Multipart upload aborted successfully.");
			}).catch(err => {
				console.warn("Multipart create or abort failed: ", err);
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
export type BodyDataTypes = UploadFileOptions["body"];

export interface RawDataPart {
	partNumber: number;
	data: Buffer;
	lastPart?: boolean;
}

export type FileUploadMetadata = Partial<Pick<FileMetadata, "mimeType" | "contentDisposition" | "customMetadata">>;

export interface UploadParams {
	bucket: string,
	fileName: string,
	body: StreamingBlobPayloadInputTypes,
	metadata: FileUploadMetadata,
}

export interface UploadProgress {
	totalBytes: number | undefined,
	uploadedBytes: number,
	state: UploadState,
}
