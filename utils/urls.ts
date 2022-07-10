export const DOMAIN = (process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`) 
    || "https://getlink.vercel.app";

export function createUrl(...segments: string[]) {
	return createAbsoluteUrl("", ...segments);
}

export function createAbsoluteUrl(baseUrl: string, ...segments: string[]) {
	const suffix = segments.reduce((prev, current) => prev + "/" + encodeURIComponent(current));
	return baseUrl + "/" + suffix;
}