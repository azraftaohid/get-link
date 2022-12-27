import { Falsy } from "./falsy";

export function mergeNames(name: string | Falsy, ...otherNames: (string | Falsy)[]): string {
	let res = name || "";
	for (const s of otherNames) {
		if (s) res += " " + s;
	}

	return res;
}
