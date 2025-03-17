let hasInit = false;

export function init() {
	if (hasInit) return;
	hasInit = true;

	// TODO: remove the following block as it is handled by next config.compiler.removeConsole
	if (process.env.NODE_ENV === "production") {
		const noOp = () => {
			/* no-op */
		};
		console.debug = noOp;
		console.log = noOp;
	}
}
