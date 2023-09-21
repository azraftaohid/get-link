let hasInit = false;

export function init() {
	if (hasInit) return;
	hasInit = true;

	if (process.env.NODE_ENV === "production") {
		const noOp = () => {
			/* no-op */
		};
		console.debug = noOp;
		console.log = noOp;
	}
}
