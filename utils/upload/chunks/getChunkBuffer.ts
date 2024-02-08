// Built based on @aws-sdk/lib-storage
// @see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage

import { RawDataPart } from "../Upload";

export async function* getChunkBuffer(data: Buffer, partSize: number): AsyncGenerator<RawDataPart, void, undefined> {
	let partNumber = 1;
	let startByte = 0;
	let endByte = partSize;

	while (endByte < data.byteLength) {
		yield {
			partNumber,
			data: data.slice(startByte, endByte),
		};
		partNumber += 1;
		startByte = endByte;
		endByte = startByte + partSize;
	}

	yield {
		partNumber,
		data: data.slice(startByte),
		lastPart: true,
	};
}
