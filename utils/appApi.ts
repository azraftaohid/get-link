export function getAppApiUrl() {
	if (typeof document !== "undefined") {
		return `${document.location.protocol}//${document.location.host}/api`;
	} else if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}/api`;
	} else {
		return "http://127.0.0.1:3000/api";
	}
}
