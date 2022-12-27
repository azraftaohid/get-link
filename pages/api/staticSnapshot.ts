import { DocumentData, DocumentReference, DocumentSnapshot, GeoPoint, Timestamp } from "firebase/firestore/lite";

/**
 * @param snapshot document snapshot received from firestore query result
 * @returns a static version of snapshot
 */
export function toStatic<T extends DocumentData>(snapshot: DocumentSnapshot<T>): StaticSnapshot<T> {
	const serialized = JSON.stringify(snapshot.data(), (_k, value) => {
		if (value === undefined) return null;
		if (value instanceof DocumentReference) return value.path;
		return value;
	});

	return {
		data: JSON.parse(serialized),
		exists: snapshot.exists(),
		id: snapshot.id,
		path: snapshot.ref.path,
		firebaseApp: snapshot.ref.firestore.app.name,
	};
}

export interface StaticSnapshot<T extends DocumentData> {
	data: StaticData<T> | undefined,
	exists: boolean,
	id: string,
	path: string,
	firebaseApp: string,
}

export type StaticData<T extends DocumentData> = {
	[K in keyof T]: Timestamp extends T[K]
	? ReturnType<Timestamp["toJSON"]>
	: GeoPoint extends T[K]
	? ReturnType<GeoPoint["toJSON"]>
	: DocumentReference extends T[K]
	? string
	: T[K] extends Record<string, unknown>
	? StaticData<T[K]>
	: T[K];
}