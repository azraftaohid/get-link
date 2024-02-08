export function isTimeoutError(error: unknown) {
	return error instanceof TypeError && `${error.cause}`.startsWith("ConnectTimeoutError:");
}
