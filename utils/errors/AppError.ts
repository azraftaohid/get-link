import { BaseError } from "./BaseError";

export class AppError extends BaseError {
	public readonly code: string;

	constructor(code: string, message: string) {
		super(`${message} [code: ${code}]`);
		this.code = code;
	}
}
