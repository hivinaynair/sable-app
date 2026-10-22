import { describe, expect, it } from "bun:test";
import { collapseEquivalents, openingIdentity } from "../src/identity";
import { hoursAgo, opening } from "./factory";

describe("exact-opening identity and deduplication", () => {
  it("J5.S3.c2 collapses one opening found through two sources into one candidate, keeping both sources", () => {
    const fromBoard = opening({ sourceUrls: ["https://boards.example.test/emp-a/jobs/100"], lastVerifiedAt: hoursAgo(5) });
    const fromCareers = opening({ sourceUrls: ["https://emp-a.example.test/careers/100"], lastVerifiedAt: hoursAgo(1) });
    const [only, ...rest] = collapseEquivalents([fromBoard, fromCareers]);
    expect(rest).toHaveLength(0);
    expect(only?.sourceUrls).toEqual(["https://boards.example.test/emp-a/jobs/100", "https://emp-a.example.test/careers/100"]);
    expect(only?.lastVerifiedAt).toEqual(hoursAgo(1));
  });

  it("J5.S3.c3 treats a different requisition at the same employer as a different opening", () => {
    expect(openingIdentity(opening({ requisitionId: "R-100" }))).not.toEqual(openingIdentity(opening({ requisitionId: "R-200" })));
  });

  it("J6.S3.c2 keeps one identity when only the update date changes", () => {
    expect(openingIdentity(opening({ updatedAt: hoursAgo(1) }))).toEqual(openingIdentity(opening({ updatedAt: hoursAgo(90) })));
  });

  it("J5.S3.c2 falls back to a normalised canonical URL when no requisition id is published", () => {
    const a = opening({ requisitionId: null, canonicalUrl: "https://Jobs.Example.test/emp-a/100/?utm_source=x#apply" });
    const b = opening({ requisitionId: null, canonicalUrl: "https://jobs.example.test/emp-a/100" });
    expect(openingIdentity(a)).toEqual(openingIdentity(b));
  });

  it("J5.S3.c2 prefers verified-open evidence over uncertain when collapsing", () => {
    const uncertain = opening({ availability: "uncertain", lastVerifiedAt: hoursAgo(0) });
    const open = opening({ availability: "verified_open", lastVerifiedAt: hoursAgo(3) });
    expect(collapseEquivalents([uncertain, open])[0]?.availability).toBe("verified_open");
  });
});
