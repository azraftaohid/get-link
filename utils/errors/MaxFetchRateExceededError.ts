export class MaxFetchRateExceededError extends Error {
	constructor() {
		super();
		this.name = "MaxFetchRateExceeded";
	}
}
