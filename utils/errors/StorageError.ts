import util from "util";
import { BaseError } from "./BaseError";

export class StorageError extends BaseError {
	public code: StorageErrorCodes;
	public cause: unknown;

	constructor(code: StorageErrorCodes, message: string, cause?: unknown) {
		super(`${message} [code: ${code}; cause: ${util.format(cause)}]`);
		
		this.code = code;
		this.cause = cause;
	}
}

export type StorageErrorCodes = "storage:no-multipart-file-id" | 
	"storage:unknown-error" | 
	"storage:upload-canceled" |
	"storage:put-failed" |
	"storage:upload-part-failed" |
	"storage:multipart-init-failed" |
	"storage:multipart-finalize-failed" |
	"storage:part-etag-missing" |
	"storage:api-error" |
	"storage:not-found" |
	"storage:get-upload-url-failed" |
	"storage:no-upload-url" |
	"storage:create-sha1-hash-error" |
	"storage:get-part-upload-url-failed" |
	"storage:no-part-upload-url" |
	"storage:part-sha1-checksum-missing" |
	"storage:json-parse-error" |
	"storage:invalid-upload-options" |
	"storage:invalid-part-upload-options";
