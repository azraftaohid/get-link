import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CompletedPart, CreateMultipartUploadCommand, CreateMultipartUploadCommandInput, CreateMultipartUploadCommandOutput, PutObjectCommand, PutObjectCommandInput, S3Client, UploadPartCommand, UploadPartOutput } from "@aws-sdk/client-s3";
// import { AbortController } from "@smithy/abort-controller";
import { HttpRequest } from "@smithy/protocol-http";
import { StreamingBlobPayloadInputTypes } from "@smithy/types";
import EventEmitter from "events";
import { AppHttpHandler } from "../AppHttpHandler";
import { StorageError } from "../errors/StorageError";
import { byteLength } from "./bytelength";
import { getChunk } from "./chunker";

export class Upload extends EventEmitter {
	public static MIN_PART_SIZE = 5 * Math.pow(2, 20);
	public static MAX_PARTS = 10000;

	private s3: S3Client;
	private body: StreamingBlobPayloadInputTypes;
	private params: Omit<UploadParams, "Body">;

	private totalBytes: number | undefined;
	private uploadedBytes: number;

	private partSize: number;

	private feed: AsyncGenerator<RawDataPart, void, undefined> | undefined;

	private _state: UploadState;
	private aborter: AbortController;

	private createMultipartUploadPromise: Promise<CreateMultipartUploadCommandOutput> | undefined;
	private uploadId: string | undefined;

	private multipart: boolean;
	private completedParts: (CompletedPart & { PartNumber: number })[];

	private pendings: Set<RawDataPart>;
	private locks: Set<RawDataPart>;

	private maxParallel: number;
	private active: number;

	constructor(s3: S3Client, params: UploadParams) {
		super({});

		console.debug(`Initializing uploader [key: ${params.Key}; bucket: ${params.Bucket}]`);

		this.s3 = s3;
		
		const { Body, ...rest } = params;
		this.body = Body;
		this.params = rest;

		this.totalBytes = byteLength(this.body);
		this.uploadedBytes = 0;

		this.partSize = Math.max(Upload.MIN_PART_SIZE, Math.ceil((this.totalBytes ?? 0) / Upload.MAX_PARTS));

		this._state = "none";
		this.aborter = new AbortController();

		this.multipart = true;
		this.completedParts = [];
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

	private requestIsOfThisUpload(req: HttpRequest) {
		return (req.hostname.startsWith(this.params.Bucket + ".") && req.path === `/${this.params.Key}`) ||
			req.path === `/${this.params.Bucket}/${this.params.Key}`;
	}

	private async uploadAsWhole(dataPart: RawDataPart) {
		console.debug("Uploading as whole.");

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

		const reqHandler = this.s3.config.requestHandler;
		if (reqHandler instanceof AppHttpHandler) {
			console.debug("Request handler is an AppHttpHandler. Registering progress handler.");
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		try {
			const res = await this.s3.send(new PutObjectCommand({
				...this.params,
				Body: dataPart.data,
			}), { abortSignal: this.aborter.signal, });
			
			// for some reasons, S3Client#send is not throwing automatically on error for XhrHttpHandler request handler.
			// we are manually checking the status for failed request.
			if (res.$metadata.httpStatusCode !== 200) {
				throw new Error(`Put object command send failed [status: ${res.$metadata.httpStatusCode}]`);
			}
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
			const partSize = byteLength(dataPart.data);
			this.uploadedBytes += partSize || 0;

			this.emit("progress", this.makeProgress());
		}
	}

	private async uploadAsPart(dataPart: RawDataPart) {
		console.debug("Uploading data part: ", dataPart.partNumber);

		if (!this.uploadId) {
			if (!this.createMultipartUploadPromise) this.createMultipartUploadPromise = this.s3.send(new CreateMultipartUploadCommand({
				...this.params,
			}));

			try {
				const res = await this.createMultipartUploadPromise;
				this.uploadId = res.UploadId;
			} catch (error) {
				throw new StorageError("storage:multipart-init-failed", "Unable to initialize multipart upload", error);
			}

			if (!this.uploadId) {
				throw new StorageError("storage:upload-id-not-found", "Create multipart upload request did not return an Upload ID.", null);
			}
		}

		if (this.locks.has(dataPart) || this.getState() !== "running") return;
		this.locks.add(dataPart);

		const partSize = byteLength(dataPart.data);

		let calculatedBytes = 0;
		const progressHandler = (evt: ProgressEvent, req: HttpRequest) => {
			const reqPartNumber = Number(req.query.partNumber) || -1;
			if (!this.requestIsOfThisUpload(req) || reqPartNumber !== dataPart.partNumber) {
				return;
			}

			if (evt.total && partSize) {
				this.uploadedBytes += evt.loaded - calculatedBytes;
				calculatedBytes = evt.loaded;
			}

			this.emit("progress", this.makeProgress());
		};

		const reqHandler = this.s3.config.requestHandler;
		if (reqHandler instanceof AppHttpHandler) {
			console.debug("Request handler is an AppHttpHandler. Registering progress handler.");
			reqHandler.on("xhrUploadProgress", progressHandler);
		}

		let partResult: UploadPartOutput;
		try {
			partResult = await this.s3.send(new UploadPartCommand({
				...this.params,
				Body: dataPart.data,
				UploadId: this.uploadId,
				PartNumber: dataPart.partNumber,
			}), { abortSignal: this.aborter.signal });

			if (!partResult.ETag) {
				throw new StorageError("storage:part-etag-missing", 
					`ETag of part ${dataPart.partNumber} is missing in UploadPart response. `
					+ "Make sure that the 'etag' header is exposed to the client application via CORS rules.", null);
			}
		} catch (error) {
			if (error instanceof StorageError) throw error;
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

		this.completedParts.push({
			PartNumber: dataPart.partNumber,
			ETag: partResult.ETag,
			...(partResult.ChecksumCRC32 && { ChecksumCRC32: partResult.ChecksumCRC32 }),
			...(partResult.ChecksumCRC32C && { ChecksumCRC32C: partResult.ChecksumCRC32C }),
			...(partResult.ChecksumSHA1 && { ChecksumSHA1: partResult.ChecksumSHA1 }),
			...(partResult.ChecksumSHA256 && { ChecksumSHA256: partResult.ChecksumSHA256 }),
		});
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
			this.feed = getChunk(this.body, this.partSize);
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
			this.completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

			try {
				await this.s3.send(new CompleteMultipartUploadCommand({
					...this.params,
					UploadId: this.uploadId,
					MultipartUpload: {
						Parts: this.completedParts,
					},
				}));
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
		if (!(current === "none" || current === "running" || current === "paused")) return false;

		this.aborter.abort();
		const b = this.setState("canceled");
		if (b) this.emit("failed", new StorageError("storage:upload-canceled", "Upload was aborted by user", null));

		if (this.createMultipartUploadPromise) {
			console.debug("Multipart upload was in progress. Attempting to abort...");
			this.createMultipartUploadPromise.then(async output => {
				console.debug("Create multipart upload command finished. Sending abort request...");
				await this.s3.send(new AbortMultipartUploadCommand({
					Bucket: this.params.Bucket,
					Key: this.params.Key,
					UploadId: output.UploadId,
				})).then(() => {
					console.debug("Multipart upload aborted successfully.");
				}).catch(err => {
					console.warn("Multipart create or abort failed: ", err);
				});
			});
		}

		return b;
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
export type BodyDataTypes = PutObjectCommandInput["Body"];

export interface RawDataPart {
	partNumber: number;
	data: BodyDataTypes;
	lastPart?: boolean;
}

export interface UploadParams extends CreateMultipartUploadCommandInput {
	Bucket: string,
	Key: string,
	Body: StreamingBlobPayloadInputTypes,
}

export interface UploadProgress {
	totalBytes: number | undefined,
	uploadedBytes: number,
	state: UploadState,
}
