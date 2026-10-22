import { describe, expect, it } from "bun:test";
import { selectDigest, type DigestRequest } from "../src/digest";
import { openingIdentity } from "../src/identity";
import type { Opening } from "../src/types";
import { NOW, constraints, hoursAgo, opening } from "./factory";

const scored = (openings: Opening[], score = 0.8) => new Map(openings.map((o) => [openingIdentity(o), score]));

function request(candidates: Opening[], overrides: Partial<DigestRequest> = {}): DigestRequest {
  return {
    candidates,
    constraints: constraints(),
    history: { seen: new Set(), employersWithHistory: new Set() },
    scores: scored(candidates),
    size: 10,
    now: NOW,
    ...overrides,
  };
}

const many = (n: number) => Array.from({ length: n }, (_, i) => opening({ requisitionId: `R-${i}` }));

describe("digest selection", () => {
  it("J5.S6.c1 returns only the surviving matches and reports a shortfall against the subscriber's target", () => {
    const result = selectDigest(request(many(3)));
    expect(result.items).toHaveLength(3);
    expect(result.target).toBe(10);
    expect(result.shortfall).toBe(true);
  });

  it("J5.S6.c2 never pads to reach the target with openings that failed a filter", () => {
    const good = many(2);
    const closed = opening({ requisitionId: "R-closed", availability: "confirmed_closed" });
    const uncertain = opening({ requisitionId: "R-uncertain", availability: "uncertain" });
    const elsewhere = opening({ requisitionId: "R-gb", locations: ["GB"] });
    const all = [...good, closed, uncertain, elsewhere];
    const result = selectDigest(request(all, { constraints: constraints({ countries: ["SG"] }) }));
    expect(result.items.map((i) => i.opening.requisitionId).sort()).toEqual(["R-0", "R-1"]);
    expect(result.excluded).toEqual({ not_verified_open: 1, needs_revalidation: 1, location_mismatch: 1 });
  });

  it("J5.S4.c2 includes only verified-open openings within their freshness window", () => {
    const stale = opening({ requisitionId: "R-stale", evidenceTier: "browser", lastVerifiedAt: hoursAgo(30) });
    const fresh = opening({ requisitionId: "R-fresh" });
    const result = selectDigest(request([stale, fresh]));
    expect(result.items.map((i) => i.opening.requisitionId)).toEqual(["R-fresh"]);
    expect(result.toRevalidate.map((o) => o.requisitionId)).toEqual(["R-stale"]);
  });

  it("J5.S3.c1 removes openings already delivered to the subscriber", () => {
    const [sent, unsent] = many(2) as [Opening, Opening];
    const result = selectDigest(request([sent, unsent], { history: { seen: new Set([openingIdentity(sent)]), employersWithHistory: new Set() } }));
    expect(result.items.map((i) => i.opening.requisitionId)).toEqual([unsent.requisitionId]);
    expect(result.excluded.already_seen).toBe(1);
  });

  it("J5.S3.c3 keeps a different requisition at an employer the subscriber already applied to, and labels it", () => {
    const appliedTo = opening({ requisitionId: "R-applied" });
    const sibling = opening({ requisitionId: "R-new" });
    const history = { seen: new Set([openingIdentity(appliedTo)]), employersWithHistory: new Set(["emp-a"]) };
    const result = selectDigest(request([appliedTo, sibling], { history }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.labels).toContain("different_requisition");
  });

  it("J5.S3.c4 labels a reopened role rather than suppressing it", () => {
    const result = selectDigest(request([opening({ reopened: true })]));
    expect(result.items[0]?.labels).toContain("reopened");
  });

  it("J5.S5.c5 drops a candidate whose relevance output failed validation and so has no score", () => {
    const [kept, unscored] = many(2) as [Opening, Opening];
    const result = selectDigest(request([kept, unscored], { scores: scored([kept]) }));
    expect(result.items.map((i) => i.opening.requisitionId)).toEqual([kept.requisitionId]);
    expect(result.excluded.unscored).toBe(1);
  });

  it("D14 ranks by score and returns at most the configured size", () => {
    const openings = many(5);
    const scores = new Map(openings.map((o, i) => [openingIdentity(o), i / 10]));
    const result = selectDigest(request(openings, { scores, size: 3 }));
    expect(result.items.map((i) => i.opening.requisitionId)).toEqual(["R-4", "R-3", "R-2"]);
    expect(result.shortfall).toBe(false);
  });

  it("I2 never returns the same opening twice when it arrives from two sources", () => {
    const a = opening({ sourceUrls: ["https://boards.example.test/emp-a/jobs/100"] });
    const b = opening({ sourceUrls: ["https://emp-a.example.test/careers/100"] });
    expect(selectDigest(request([a, b])).items).toHaveLength(1);
  });
});
