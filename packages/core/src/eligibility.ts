import type { ExclusionReason, HardConstraints, Opening, OpeningLabel } from "./types";

export type EligibilityResult =
  | { eligible: true; labels: OpeningLabel[] }
  | { eligible: false; reason: ExclusionReason };

/**
 * Applies a subscriber's hard constraints to one opening, before any ranking (D13).
 * Unknown evidence never satisfies a constraint (D16): the only exception is the
 * explicit opt-in to see unknown sponsorship, which is then labelled (D92).
 */
export function checkEligibility(opening: Opening, c: HardConstraints): EligibilityResult {
  if (c.excludedEmployerIds.includes(opening.employerId)) {
    return { eligible: false, reason: "employer_excluded" };
  }

  if (c.arrangements.length > 0) {
    if (opening.arrangement === null) return { eligible: false, reason: "arrangement_unknown" };
    if (!c.arrangements.includes(opening.arrangement)) {
      return { eligible: false, reason: "arrangement_mismatch" };
    }
  }

  const location = checkLocation(opening, c.countries);
  if (location) return { eligible: false, reason: location };

  const labels: OpeningLabel[] = [];
  if (c.requiresSponsorship) {
    if (opening.sponsorship === "explicitly_not_offered") {
      return { eligible: false, reason: "sponsorship_not_offered" };
    }
    if (opening.sponsorship === "not_stated") {
      if (!c.includeUnknownSponsorship) return { eligible: false, reason: "sponsorship_unknown" };
      labels.push("sponsorship_unknown");
    }
  }

  return { eligible: true, labels };
}

function checkLocation(opening: Opening, countries: string[]): ExclusionReason | null {
  if (countries.length === 0) return null;

  if (opening.arrangement === "remote") {
    // Remote is never assumed to be worldwide (D42).
    switch (opening.remoteScope) {
      case "worldwide_stated":
        return null;
      case "not_stated":
        return "remote_region_unknown";
      case "restricted_to_regions":
        return opening.remoteRegions.some((r) => countries.includes(r)) ? null : "remote_region_mismatch";
    }
  }

  return opening.locations.some((l) => countries.includes(l)) ? null : "location_mismatch";
}
