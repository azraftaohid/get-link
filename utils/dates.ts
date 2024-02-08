import { Days } from "@thegoodcompany/common-utils-js";
import { Timestamp } from "firebase/firestore";
import { EXPIRE_DAYS } from "./configs";

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

export function hasExpired(expireTime?: ReturnType<Timestamp["toJSON"]>, createTime?: ReturnType<Timestamp["toJSON"]>) {
	const expireSeconds = expireTime?.seconds || ((createTime?.seconds || 0) + new Days(EXPIRE_DAYS).toSeconds().value);
	return now() / 1000 > expireSeconds;
}
