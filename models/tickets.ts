import { customAlphabet } from "nanoid";

let idGenerator: (size: number) => string;

export function createTicketId() {
	if (!idGenerator) idGenerator = customAlphabet("23456789abcdefghijkmnpqrstuvwxyz", 10);
	return `${idGenerator(4)}-${idGenerator(5)}`;
}
