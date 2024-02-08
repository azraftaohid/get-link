export function descriptiveNumber(n: number) {
	switch (n) {
		case 0: return "Zero";
		case 1: return "Single";
		case 2: return "Two";
		case 3: return "Three";
		default: return n.toString();
	}
}
