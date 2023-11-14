export { };

declare global {
	interface Window {
		clarity: (action: "identify" | "set", ...args: string[]) => void;
		FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string;
	}
}
