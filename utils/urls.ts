export const DOMAIN = "https://getlink.vercel.app";

export function createUrl(...segments: string[]) {
	return createAbsoluteUrl("", ...segments);
}

export function createAbsoluteUrl(baseUrl: string, ...segments: string[]) {
	const suffix = segments.reduce((prev, current) => prev + "/" + encodeURIComponent(current));
	return baseUrl + "/" + suffix;
}