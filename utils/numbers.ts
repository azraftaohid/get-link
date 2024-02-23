export function descriptiveNumber(n: number) {
	switch (n) {
		case 0: return "Zero";
		case 1: return "Single";
		case 2: return "Two";
		case 3: return "Three";
		default: return n.toString();
	}
}

/**
 * Converts the given decimal value into a base of provided base characters. E.g., decimal 5 to base chars of "01" -> "101".
 * 
 * @param decimalValue The value to convert
 * @param baseChars Characters present in the conversion base, in ascending order
 * @returns The provided value in desired base
 */
export function toBase(decimalValue: number, baseChars: string) {
	if (decimalValue < 0) throw new Error("Can not change base of negative value");
	const base = baseChars.length;
    const result: string[] = [];

    let quotient = decimalValue;
    do {
        result.push(baseChars[quotient % base]);
        quotient = Math.floor(quotient / base);
    } while (quotient !== 0);

    return result.reverse().join("");
}
