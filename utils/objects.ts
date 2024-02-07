import { Bytes, DocumentReference, FieldValue, GeoPoint, Primitive, Timestamp, WithFieldValue } from "firebase/firestore";
import { Falsy } from "./falsy";

// eslint-disable-next-line @typescript-eslint/ban-types
export function ensureProperty<T extends {}, K extends keyof WithFieldValue<T>>(
	parent: WithFieldValue<T>,
	key: K,
	fallback: Exclude<WithFieldValue<T>[K], FieldValue | undefined>
): Exclude<WithFieldValue<T>[K], FieldValue | undefined> {
	const current = parent[key];
	if (current === undefined || current === null || current instanceof FieldValue) {
		return parent[key] = fallback;
	} else {
		return current as Exclude<WithFieldValue<T>[K], FieldValue | undefined>;
	}
}

export function flatten<T extends Record<string, any>>(data: T): Flattened<T> {
	const result: Record<string, any> = {};

	const appendToResult = (obj: Record<string, any>, prefix = "") => {
		for (const key in obj) {
			const value = obj[key];
			const newKey = prefix ? `${prefix}.${key}` : key.toString();

			if (isPrimitive(value)
				|| Array.isArray(value)
				|| value instanceof Bytes
				|| value instanceof FieldValue
				|| value instanceof Timestamp
				|| value instanceof Date
				|| value instanceof GeoPoint
				|| value instanceof DocumentReference) result[newKey] = value;
			else appendToResult(value, newKey);
		}
	};

	appendToResult(data);

	return result as Flattened<T>;
}

export function isPrimitive(value: unknown): value is Primitive {
	return value === null || ["string", "number", "boolean", "undefined"].includes(typeof value);
}

export function accessProperty<T, R>(obj: T, dottedKey: string & keyof Flattened<T>): R {
	let lvl: any = obj;
	dottedKey.split(".").forEach(key => lvl = lvl?.[key]);

	return lvl;
}

export function whenTruthy<T, R>(o: T | Falsy, callback: (t: T) => R): R | undefined {
	if (o) return callback(o);
	return undefined;
}

/**
 * @author Chat GPT <https://chat.openai.com/chat>
 */
export type Flattened<T> = T extends object
	? {
		[K in keyof T & string as `${K & string}` | `${K & string}.${Flattened<Exclude<T[K], undefined>> extends object ? Exclude<keyof Flattened<Exclude<T[K], undefined>>, symbol> : never}`]?: Array<unknown> | Primitive | Bytes | Timestamp | Date | GeoPoint | DocumentReference;
	}
	: T;
