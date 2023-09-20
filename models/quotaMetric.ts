export function isQuotaMetric(obj: unknown): obj is QuotaMetric {
	return obj !== null && typeof obj === "object" && "limit" in obj && typeof (obj as { limit: unknown }).limit === "number";
}

export interface QuotaMetric {
	limit?: number,
	current_usage?: number,
}
