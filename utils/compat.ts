export { };

declare global {
	interface Window {
		clarity: (action: "identify" | "set", ...args: string[]) => void,
	}
}