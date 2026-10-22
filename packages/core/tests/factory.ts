import type { HardConstraints, Opening } from "../src/types";

// Synthetic test values, not catalogue data. Nothing here describes a real opening.
export const NOW = new Date("2026-10-22T09:00:00Z");
export const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

export function opening(overrides: Partial<Opening> = {}): Opening {
  return {
    employerId: "emp-a",
    requisitionId: "R-100",
    canonicalUrl: "https://boards.example.test/emp-a/jobs/100",
    sourceUrls: ["https://boards.example.test/emp-a/jobs/100"],
    title: "Frontend Engineer",
    arrangement: "on_site",
    locations: ["SG"],
    remoteScope: "not_stated",
    remoteRegions: [],
    sponsorship: "offered_explicitly",
    availability: "verified_open",
    evidenceTier: "feed",
    lastVerifiedAt: hoursAgo(1),
    publishedAt: hoursAgo(100),
    updatedAt: hoursAgo(10),
    firstSeenAt: hoursAgo(50),
    reopened: false,
    ...overrides,
  };
}

export function constraints(overrides: Partial<HardConstraints> = {}): HardConstraints {
  return {
    arrangements: [],
    countries: [],
    requiresSponsorship: false,
    includeUnknownSponsorship: false,
    excludedEmployerIds: [],
    ...overrides,
  };
}
