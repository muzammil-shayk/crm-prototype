export const TIERS = ["strong", "medium", "weak"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_THRESHOLDS = { strong: 70, medium: 40 } as const;
