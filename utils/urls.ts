import { QueryParameterBag } from "@smithy/types";

export const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "https://getlink.vercel.app";

export function createUrl(...segments: string[]) {
	return createAbsoluteUrl("", ...segments);
}

export function createAbsoluteUrl(baseUrl: string, ...segments: string[]) {
	const suffix = segments.reduce((prev, current) => prev + "/" + encodeURIComponent(current));
	return baseUrl + "/" + suffix;
}

export function mapQueryParams(searchParams: URLSearchParams) {
	const mapping: QueryParameterBag = { };
	if (searchParams.size === 0) return mapping;

	Array.from(searchParams.entries()).forEach(([key, value]) => mapping[key] = value);
	return mapping;
}

export function makeContinueUrl(mode: string, then = window.location.pathname) {
	return `${window.location.origin}/continue/${mode}?path=${encodeURIComponent(then)}`;
}

export function isDifferentPage(href: string) {
	const current = new URL(window.location.href);
	const url = new URL(href, current.href);

	return url.host === current.host && 
		(url.pathname !== current.pathname || url.search !== current.search);
}
