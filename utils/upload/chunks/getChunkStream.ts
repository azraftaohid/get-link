// Built based on @aws-sdk/lib-storage
// @see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage

import { Buffer } from "buffer";

import { RawDataPart, Upload } from "../Upload";

interface Buffers {
	chunks: Buffer[];
	length: number;
}

function pickPartSizeFactor() {
	for ( ; ; ) {
		const rand = Math.random();
		if (rand > .75) return rand;
	}
}

export async function* getChunkStream<T>(
	data: T,
	partSize: number,
	getNextData: (data: T) => AsyncGenerator<Buffer>,
	diffSize?: boolean
): AsyncGenerator<RawDataPart, void, undefined> {
	let partNumber = 1;
	const currentBuffer: Buffers = { chunks: [], length: 0 };

	// parts of equal size may complete upload at the same time; hence upload may be idle during their finalization
	// to remedy that, parts of different sizes can be used 
	const nextPartSizeGenerator = diffSize ? () => Math.max(Upload.MIN_PART_SIZE, partSize * pickPartSizeFactor()) : () => partSize;
	let nextPartSize = partSize;
	for await (const datum of getNextData(data)) {
		currentBuffer.chunks.push(datum);
		currentBuffer.length += datum.length;

		while (currentBuffer.length > nextPartSize) {
			/**
			 * Concat all the buffers together once if there is more than one to concat. Attempt
			 * to minimize concats as Buffer.Concat is an extremely expensive operation.
			 */
			const dataChunk = currentBuffer.chunks.length > 1 ? Buffer.concat(currentBuffer.chunks) : currentBuffer.chunks[0];

			yield {
				partNumber,
				data: dataChunk.slice(0, nextPartSize),
			};

			// Reset the buffer.
			currentBuffer.chunks = [dataChunk.slice(nextPartSize)];
			currentBuffer.length = currentBuffer.chunks[0].length;
			partNumber += 1;

			nextPartSize = nextPartSizeGenerator();
		}
	}
	yield {
		partNumber,
		data: Buffer.concat(currentBuffer.chunks),
		lastPart: true,
	};
}
