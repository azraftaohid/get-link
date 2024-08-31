import { DocumentData, FirestoreError, Query, QuerySnapshot, Unsubscribe, onSnapshot } from "firebase/firestore";

let pool: Map<string, PoolValue> | undefined;

export function onQuerySnapshot<T extends DocumentData>(
	key: string, 
	query: Query<T>, 
	onNext: (snapshot: QuerySnapshot<DocumentData, DocumentData>) => void, 
	onError?: (error: FirestoreError) => void
): Unsubscribe {
	if (!pool) pool = new Map();

	let poolValue = pool.get(key);
	if (poolValue) {
		if (poolValue.current instanceof QuerySnapshot) onNext(poolValue.current);
		else if (onError && poolValue.current instanceof FirestoreError) {
			onError(poolValue.current);
		}
	} else {
		const unsubscribe = onSnapshot(query, snapshot => {
			poolValue?.onChanges.forEach(callback => callback(snapshot));
		}, error => {
			poolValue?.onErrors.forEach(callback => callback(error));
		});
	
		poolValue = {
			onChanges: [],
			onErrors: [],
			unsubscribe,
		};
	
		pool.set(key, poolValue);
	}

	poolValue.onChanges.push(onNext);
	if (onError) poolValue.onErrors.push(onError);

	return () => {
		if (!poolValue) {
			console.warn("Unable to subscribe from snapshot pool, pool value is not defined.");
			return;
		}

		const nIndex = poolValue.onChanges.findIndex(a => a === onNext);
		if (nIndex !== -1)
			poolValue.onChanges = [...poolValue.onChanges.slice(0, nIndex), ...poolValue.onChanges.slice(nIndex + 1)];

		if (onError) {
			const eIndex = poolValue.onErrors.findIndex(a => a === onError);
			if (eIndex !== -1)
				poolValue.onErrors = [...poolValue.onErrors.slice(0, eIndex), ...poolValue.onErrors.slice(eIndex + 1)];
		}

		if (poolValue.onChanges.length === 0) poolValue.unsubscribe();
	};
}

interface PoolValue {
	current?: QuerySnapshot | FirestoreError,
	onChanges: ((snapshot: QuerySnapshot<DocumentData, DocumentData>) => void)[],
	onErrors: ((error: FirestoreError) => void)[],
	unsubscribe: Unsubscribe,
}
