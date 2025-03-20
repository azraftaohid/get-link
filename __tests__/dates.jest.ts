import { Days, Hours } from "@thegoodcompany/common-utils-js";
import { hasExpired, isWithin, wasWithin } from "../utils/dates";

test("date utils are valid", () => {
	const now = new Date().getTime();
	const ago = new Date(now - 2 * 24 * 60 * 60 * 1000);
	const late = new Date(now + 2 * 24 * 60 * 60 * 1000);

	expect(wasWithin(ago, new Days(5).toMillis().value)).toBe(true);
	expect(isWithin(late, new Days(5).toMillis().value)).toBe(true);

	expect(wasWithin(ago, new Days(2).toMillis().value + 1000)).toBe(true);
	expect(isWithin(late, new Days(2).toMillis().value + 1000)).toBe(true);

	expect(wasWithin(ago, new Days(1).toMillis().value)).toBe(false);
	expect(isWithin(late, new Days(1).toMillis().value)).toBe(false);

	expect(wasWithin(ago, new Days(1).toMillis().value + new Hours(23).toMillis().value)).toBe(false);
	expect(isWithin(late, new Days(1).toMillis().value + new Hours(23).toMillis().value)).toBe(false);
});

test("has expired is valid", () => {
	const cSeconds = new Date().getTime() / 1000 | 0;

	expect(hasExpired({ seconds: cSeconds - 100, nanoseconds: 0  })).toBe(true);
	expect(hasExpired({ seconds: cSeconds + 100, nanoseconds: 0 })).toBe(false);
});
