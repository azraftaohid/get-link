// Built based on @aws-sdk/lib-storage
// @see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage

import { Buffer } from "buffer";
import { Readable } from "stream";

export async function* getDataReadable(data: Readable): AsyncGenerator<Buffer> {
	for await (const chunk of data) {
		yield Buffer.from(chunk);
	}
}
