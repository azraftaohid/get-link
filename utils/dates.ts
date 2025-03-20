import { Timestamp } from "firebase/firestore";

export function now() {
	return new Date().getTime();
}

export function wasWithin(date: Date, ms: number) {
	const diff = now() - date.getTime();
	return diff <= ms;
}

export function isWithin(date: Date, ms: number) {
	const diff = date.getTime() - now();
	return diff <= ms;
}

export function isIn(date: Date, ms: number) {
	const diff = now() - date.getTime();
	return Math.abs(diff) <= ms;
}

export function hasExpired(expireTime?: ReturnType<Timestamp["toJSON"]> | null) {
	return expireTime && now() / 1000 > expireTime.seconds;
}
