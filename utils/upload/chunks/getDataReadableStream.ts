// Built based on @aws-sdk/lib-storage
// @see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage

import { Buffer } from "buffer";

export async function* getDataReadableStream(data: ReadableStream): AsyncGenerator<Buffer> {
	// Get a lock on the stream.
	const reader = data.getReader();

	const cleanup = () => reader.releaseLock();
	try {
		while (true) {
			// Read from the stream.
			const { done, value } = await reader.read();
			// Exit if we're done.
			if (done) return cleanup();
			// Else yield the chunk.
			yield Buffer.from(value);
		}
	} catch (e) {
		// release the lock for reading from this stream.
		cleanup();
	}
}
