import { StorageError } from "./StorageError";

export class NotFound extends StorageError {
	constructor() {
		super("storage:not-found", "The requested objest does not exist!");
	}
}
