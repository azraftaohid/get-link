export class AbortError extends Error {
	constructor() {
		super();
		this.name = "AbortError";
	}
}
