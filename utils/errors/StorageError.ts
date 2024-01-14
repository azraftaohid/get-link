import util from "util";
import { BaseError } from "./BaseError";

export class StorageError extends BaseError {
	public code: StorageErrorCodes;
	public cause: unknown;

	constructor(code: StorageErrorCodes, message: string, cause: unknown) {
		super(`${message} [code: ${code}; cause: ${util.format(cause)}]`);
		
		this.code = code;
		this.cause = cause;
	}
}

export type StorageErrorCodes = "storage:upload-id-not-found" | 
	"storage:unknown-error" | 
	"storage:upload-canceled" |
	"storage:put-failed" |
	"storage:upload-part-failed" |
	"storage:multipart-init-failed" |
	"storage:multipart-finalize-failed" |
	"storage:part-etag-missing";
