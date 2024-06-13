export class MaxAttemptExceededError extends Error {
	constructor() {
		super();
		this.name = "MaxAttemptExceeded";
	}
}
