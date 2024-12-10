export type Tier = "tier1-000" | "tier2-000" | "tier2-001" | "tier2-002" | "tier2-003" | "tier2-004";

export const friendlyTier: Record<Tier, string> = {
	"tier1-000": "Free",
	"tier2-000": "Pro",
	"tier2-001": "Pro",
	"tier2-002": "Pro",
	"tier2-003": "Pro",
	"tier2-004": "Pro",
};

/**
 * The base pricing for each tier (including variants) in BDT.
 */
export const tierBasePricing: Record<Tier, number> = {
	"tier1-000": 0,
	"tier2-000": 89,
	"tier2-001": 159,
	"tier2-002": 299,
	"tier2-003": 699,
	"tier2-004": 1299,
};

export const tierBaseStorageGb: Record<Tier, number> = {
	"tier1-000": 1,
	"tier2-000": 50,
	"tier2-001": 100,
	"tier2-002": 200,
	"tier2-003": 500,
	"tier2-004": 1000,
};
