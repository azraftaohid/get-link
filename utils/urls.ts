import { QueryParameterBag } from "@smithy/types";

export const DOMAIN = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000";

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
