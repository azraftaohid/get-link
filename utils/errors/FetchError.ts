import { BaseError } from "./BaseError";

export class FetchError extends BaseError {
	public readonly code: number;

	constructor(code: number, message: string) {
		super(`${message} [code: ${code}]`);
		this.code = code;
	}
}