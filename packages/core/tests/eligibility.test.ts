import { describe, expect, it } from "vitest";
import { checkEligibility } from "../src/eligibility";
import { constraints, opening } from "./factory";

// The owner's own example: on-site in Singapore or Hong Kong, sponsorship required.
const sgOrHkWithSponsorship = constraints({
  arrangements: ["on_site"],
  countries: ["SG", "HK"],
  requiresSponsorship: true,
});

describe("hard eligibility constraints", () => {
  it("J5.S2.c1 admits an on-site Singapore role that explicitly offers sponsorship", () => {
    expect(checkEligibility(opening(), sgOrHkWithSponsorship)).toEqual({ eligible: true, labels: [] });
  });

  it("J5.S2.c1 excludes an on-site role outside the requested countries", () => {
    expect(checkEligibility(opening({ locations: ["GB"] }), sgOrHkWithSponsorship)).toEqual({
      eligible: false,
      reason: "location_mismatch",
    });
  });

  it("J5.S2.c2 excludes not-stated sponsorship by default rather than treating it as offered", () => {
    expect(checkEligibility(opening({ sponsorship: "not_stated" }), sgOrHkWithSponsorship)).toEqual({
      eligible: false,
      reason: "sponsorship_unknown",
    });
  });

  it("J5.S2.c2 shows not-stated sponsorship only on opt-in, and labels it unknown", () => {
    const optedIn = { ...sgOrHkWithSponsorship, includeUnknownSponsorship: true };
    expect(checkEligibility(opening({ sponsorship: "not_stated" }), optedIn)).toEqual({
      eligible: true,
      labels: ["sponsorship_unknown"],
    });
  });

  it("J5.S2.c2 always excludes a role that explicitly does not sponsor, even with the opt-in", () => {
    const optedIn = { ...sgOrHkWithSponsorship, includeUnknownSponsorship: true };
    expect(checkEligibility(opening({ sponsorship: "explicitly_not_offered" }), optedIn)).toEqual({
      eligible: false,
      reason: "sponsorship_not_offered",
    });
  });

  it("J5.S2.c2 excludes an unknown work arrangement when the subscriber restricts arrangement", () => {
    expect(checkEligibility(opening({ arrangement: null }), sgOrHkWithSponsorship)).toEqual({
      eligible: false,
      reason: "arrangement_unknown",
    });
  });

  it("J5.S2.c3 does not treat remote with no stated region as worldwide", () => {
    const remoteFromSg = constraints({ arrangements: ["remote"], countries: ["SG"] });
    const remote = opening({ arrangement: "remote", locations: [], remoteScope: "not_stated" });
    expect(checkEligibility(remote, remoteFromSg)).toEqual({ eligible: false, reason: "remote_region_unknown" });
  });

  it("J5.S2.c3 applies a stated remote restriction to the subscriber's countries", () => {
    const remoteFromSg = constraints({ arrangements: ["remote"], countries: ["SG"] });
    const usOnly = opening({ arrangement: "remote", locations: [], remoteScope: "restricted_to_regions", remoteRegions: ["US"] });
    const apac = opening({ arrangement: "remote", locations: [], remoteScope: "restricted_to_regions", remoteRegions: ["SG", "AU"] });
    expect(checkEligibility(usOnly, remoteFromSg)).toEqual({ eligible: false, reason: "remote_region_mismatch" });
    expect(checkEligibility(apac, remoteFromSg)).toEqual({ eligible: true, labels: [] });
  });

  it("J5.S2.c3 admits a remote role only when worldwide is explicitly stated", () => {
    const remoteFromSg = constraints({ arrangements: ["remote"], countries: ["SG"] });
    const worldwide = opening({ arrangement: "remote", locations: [], remoteScope: "worldwide_stated" });
    expect(checkEligibility(worldwide, remoteFromSg)).toEqual({ eligible: true, labels: [] });
  });

  it("J5.S2.c1 excludes an employer the subscriber excluded", () => {
    expect(checkEligibility(opening(), constraints({ excludedEmployerIds: ["emp-a"] }))).toEqual({
      eligible: false,
      reason: "employer_excluded",
    });
  });
});
