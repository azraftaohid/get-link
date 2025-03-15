export { };

declare global {
	interface Window {
		clarity: (action: "identify" | "set", ...args: string[]) => void;
		FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string;
		pdfjsLib: typeof import("pdfjs-dist/types/src/pdf");
		conflux: {
			Writer: typeof import("@transcend-io/conflux").Writer;
		}
	}
}
