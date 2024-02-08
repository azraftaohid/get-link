// Built based on @aws-sdk/lib-storage
// @see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage

import { getRuntimeConfig } from "../runtimeConfig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const byteLength = (input: any): number | undefined => {
	if (input === null || input === undefined) return 0;
	if (typeof input === "string") input = Buffer.from(input);
	if (typeof input.byteLength === "number") {
		return input.byteLength;
	} else if (typeof input.length === "number") {
		return input.length;
	} else if (typeof input.size === "number") {
		return input.size;
	} else if (typeof input.path === "string") {
		try {
			return getRuntimeConfig().lstatSync(input.path).size;
		} catch (error) {
			return undefined;
		}
	}
	return undefined;
};
