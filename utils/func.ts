export function combineCallbacks<ARG>(
	cb1: ((arg: ARG) => unknown) | undefined,
	cb2: ((arg: ARG) => unknown) | undefined
): ((arg: ARG) => unknown) | undefined {
	if (!cb1) return cb2;
	if (cb2)
		return (x) => {
			cb1(x);
			cb2(x);
		};
	return cb1;
}
