import { Query, QuerySnapshot, onSnapshot, query, startAfter } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { ObservableStatus, ReactFireOptions } from "reactfire";
import { useAppVisibility } from "./useAppVisibility";

function lastNonEmptySnapshot<T>(snapshots: QuerySnapshot<T>[]): QuerySnapshot<T> | undefined {
	for (let i = snapshots.length - 1; i >= 0; i--) {
		const snapshot = snapshots[i];
		if (!snapshot.empty) return snapshot;
	}

	return undefined;
}

export const useFirestoreCollectionStream = <T> (baseQuery: Query<T>, options?: StreamOptions<QuerySnapshot<T>[]>): StreamObservableStatus<QuerySnapshot<T>[]> => {
	const visibility = useAppVisibility();

	const [snapshots, setSnapshots] = useState<QuerySnapshot<T>[]>([]);
	const [status, setStatus] = useState<ObservableStatus<T>["status"]>(options?.initialData ? "success" : "loading");
	const [isComplete, setComplete] = useState(false);
	const [error, setError] = useState<Error>();
	const [hasEmitted, setEmitted] = useState(!!options?.initialData);

	const [firstValuePromise, firstValueResolver, firstValueRejector] = useMemo<[Promise<void>, (value: void | PromiseLike<void>) => void, (reason: unknown) => void]>(() => {
		let resolver: ((value: void | PromiseLike<void>) => void) | undefined;
		let rejector: ((reason: unknown) => void) | undefined;

		const prom = new Promise<void>((res, rej) => {
			resolver = res;
			rejector = rej;
		});

		if (!resolver || !rejector) throw new Error("error initializing promise resolver and rejector");
		return [prom, resolver, rejector];
	}, []);

	const nextKey = useRef(0);
	const next = () => {
		setStatus("loading");
		const reqKey = nextKey.current++;
		console.log(`fetching next snapshot [current size: ${snapshots.length}; reqKey: ${reqKey}]`);

		const lastSnapshot = lastNonEmptySnapshot(snapshots);
		const lastDoc = lastSnapshot ? lastSnapshot.docs[lastSnapshot.size - 1] : undefined;

		console.log(`lastSnapshot: ${!!lastSnapshot}; lastDoc: ${!!lastDoc}`);

		const newQuery = lastDoc ? query(baseQuery, startAfter(lastDoc)) : baseQuery;
		onSnapshot(newQuery, snapshot => {
			firstValueResolver();

			setSnapshots(c => {
				const newC = [...c];
				newC[reqKey] = snapshot;

				return newC;
			});
			setStatus("success");
			setEmitted(true);

			if (snapshot.empty) setComplete(true);
		}, err => {
			firstValueRejector(err);

			console.error(`error listening on collection query [code: ${err.code}; mssg: ${err.message}]`);
			setError(err);
			setStatus("error");
		});
	};

	const _stateless = { next, status };
	const stateless = useRef(_stateless);
	stateless.current = _stateless;

	useEffect(() => {
		stateless.current.next();
	}, []);

	useEffect(() => {
		// todo: reload on visibility change
	}, [visibility]);

	return {
		data: snapshots,
		status, isComplete, error, hasEmitted, firstValuePromise, next,
		isEmpty: () => snapshots.every(value => value.empty),
	};
};

export interface StreamOptions<T> extends ReactFireOptions<T> {

}

export interface StreamObservableStatus<T> extends ObservableStatus<T> {
	next: () => void,
	isEmpty: () => boolean,
}
