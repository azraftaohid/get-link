export function getSharedRuntimeConfig() {
	return {
		lstatSync: () => { throw new Error("lstatSync is not supported."); },
	};
}
