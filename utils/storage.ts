import { DeleteObjectCommand, HeadObjectCommand, HeadObjectCommandOutput, NotFound, S3Client } from "@aws-sdk/client-s3";
import { StreamingBlobPayloadInputTypes } from "@smithy/types";
import { AppHttpHandler } from "./AppHttpHandler";
import { B2Credential, Backblaze, getBackblaze } from "./backblaze";
import { now } from "./dates";
import { makeDirectLink } from "./files";
import { ErrorListener, ProgressListener, Upload, UploadParams } from "./upload/Upload";

let clients: Map<B2Credential | undefined, S3Client> | undefined;

/**
 * Initialize on demand and get the storage client for making storage requests.
 * 
 * @returns The S3 client instance of current configurations.
 */
export function getStorage(b2: Backblaze = getBackblaze()): S3Client {
	console.debug("Providing storage client.");
	const b2Cred = b2.getCredential();

	let client = (clients || (clients = new Map())).get(b2Cred);
	if (!client) {
		console.debug("Creating new S3 instance.");
		client = new S3Client({
			endpoint: `https://s3.eu-central-${b2.config.clusterNo}.backblazeb2.com`,
			region: `eu-central-${b2.config.clusterNo}`,
			credentials: b2Cred && {
				accessKeyId: b2Cred.keyId,
				secretAccessKey: b2Cred.key,
			},
			requestHandler: new AppHttpHandler(),
		});

		clients.set(b2Cred, client);
	}

	return client;
}

export function getDownloadURL(key: string): string {
	return makeDirectLink(key);
}

export async function getMetadata(key: string) {
	console.debug("Getting metadata: " + key);
	const startTime = now();

	const b2 = getBackblaze();
	const storage = getStorage(b2);

	let result: HeadObjectCommandOutput;
	try {
		result = await storage.send(new HeadObjectCommand({
			Bucket: b2.config.defaultBucket,
			Key: key,
		}), { requestTimeout: 3000 });
	} catch (error) {
		console.debug(`Metadata receive failed [key: ${key}; took: ${now() - startTime}ms]`);
		throw error;
	}

	console.debug(`Metadata received [key: ${key}; took: ${now() - startTime}ms]`);
	return result;
}

export async function requireObject(key: string) {
	await getMetadata(key);
}

export async function objectExists(key: string): Promise<boolean> {
	const b2 = getBackblaze();
	const storage = getStorage(b2);

	try {
		await storage.send(new HeadObjectCommand({
			Bucket: b2.config.defaultBucket,
			Key: key,
		}));
	} catch (error) {
		if (error instanceof NotFound) return false;
		throw new Error("Failed to head object: " + error);
	}

	return true;
}

export async function deleteObject(key: string) {
	console.debug("Deleting object from server: ", key);
	const b2 = getBackblaze();
	const storage = getStorage(b2);

	return await storage.send(new DeleteObjectCommand({
		Bucket: b2.config.defaultBucket,
		Key: key,
	}));
}

export function uploadObject(key: string, blob: StreamingBlobPayloadInputTypes, params: ModularUploadParams) {
	const b2 = getBackblaze();
	const storage = getStorage(b2);

	const upload = new Upload(storage, {
		Bucket: b2.config.defaultBucket,
		Key: key,
		Body: blob,
		...params,
	});

	let stateHandler: ProgressListener | undefined;
	let errorHandler: ErrorListener | undefined;
	return new Promise((res, rej) => {
		stateHandler = ({ state }) => { if (state === "success") res(null); };
		errorHandler = (err) => { rej(err); };

		upload.on("state_changed", stateHandler);
		upload.on("failed", errorHandler);
	}).finally(() => {
		if (stateHandler) upload.off("progress", stateHandler);
		if (errorHandler) upload.off("failed", errorHandler);
	});
}

export function uploadObjectResumable(key: string, blob: StreamingBlobPayloadInputTypes, params: ModularUploadParams) {
	const b2 = getBackblaze();
	const storage = getStorage(b2);

	return new Upload(storage, {
		Bucket: b2.config.defaultBucket,
		Key: key,
		Body: blob,
		...params,
	});
}

export type ModularUploadParams = Partial<Omit<UploadParams, "Key" | "Body">>;
