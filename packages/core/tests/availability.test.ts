import { describe, expect, it } from "vitest";
import { classifyOutcome, type RetrievalOutcome } from "../src/availability";
import { needsRevalidation } from "../src/freshness";
import { NOW, hoursAgo } from "./factory";

const page = (o: Partial<Extract<RetrievalOutcome, { kind: "page" }>> = {}): RetrievalOutcome => ({
  kind: "page",
  requisitionMatches: true,
  closureNotice: false,
  applicationFormSeen: true,
  loginRequired: false,
  ...o,
});

describe("availability classification", () => {
  it("J6.S3.c3 classifies a listing present in the employer's feed as verified open from feed evidence", () => {
    expect(classifyOutcome({ kind: "feed", listed: true, complete: true })).toEqual({ availability: "verified_open", evidenceTier: "feed" });
  });

  it("J6.S3.c4 classifies a listing absent from a complete feed as confirmed closed", () => {
    expect(classifyOutcome({ kind: "feed", listed: false, complete: true }).availability).toBe("confirmed_closed");
  });

  it("J6.S2.c2 does not close a listing missing from a partial feed response", () => {
    expect(classifyOutcome({ kind: "feed", listed: false, complete: false }).availability).toBe("uncertain");
  });

  it.each<[string, RetrievalOutcome]>([
    ["a 404", { kind: "http_error", status: 404 }],
    ["a 403", { kind: "http_error", status: 403 }],
    ["a timeout", { kind: "timeout" }],
    ["a CAPTCHA", { kind: "captcha" }],
    ["a blank page", { kind: "blank_page" }],
  ])("J6.S4.c7 never classifies %s as confirmed closed", (_label, outcome) => {
    expect(classifyOutcome(outcome).availability).toBe("uncertain");
  });

  it("J6.S4.c4 does not classify an Apply button alone as verified open", () => {
    expect(classifyOutcome(page({ applicationFormSeen: false })).availability).toBe("uncertain");
  });

  it("J6.S4.c3 treats a login-gated application form as uncertain, not open", () => {
    expect(classifyOutcome(page({ loginRequired: true })).availability).toBe("uncertain");
  });

  it("J6.S4.c3 classifies an inspected application form for the matching requisition as verified open from browser evidence", () => {
    expect(classifyOutcome(page())).toEqual({ availability: "verified_open", evidenceTier: "browser" });
  });

  it("J6.S4.c3 classifies a closure notice for the matching requisition as confirmed closed", () => {
    expect(classifyOutcome(page({ closureNotice: true, applicationFormSeen: false })).availability).toBe("confirmed_closed");
  });

  it("J6.S4.c10 does not trust a page whose requisition does not match, such as a redirect to another role", () => {
    expect(classifyOutcome(page({ requisitionMatches: false, closureNotice: true })).availability).toBe("uncertain");
  });
});

describe("tiered freshness", () => {
  it("J5.S4.c1 trusts feed evidence for 48 hours", () => {
    expect(needsRevalidation({ availability: "verified_open", evidenceTier: "feed", lastVerifiedAt: hoursAgo(47) }, NOW)).toBe(false);
    expect(needsRevalidation({ availability: "verified_open", evidenceTier: "feed", lastVerifiedAt: hoursAgo(49) }, NOW)).toBe(true);
  });

  it("J5.S4.c1 trusts browser evidence for 24 hours", () => {
    expect(needsRevalidation({ availability: "verified_open", evidenceTier: "browser", lastVerifiedAt: hoursAgo(23) }, NOW)).toBe(false);
    expect(needsRevalidation({ availability: "verified_open", evidenceTier: "browser", lastVerifiedAt: hoursAgo(25) }, NOW)).toBe(true);
  });

  it("J5.S4.c1 re-checks an uncertain opening every run regardless of age", () => {
    expect(needsRevalidation({ availability: "uncertain", evidenceTier: "feed", lastVerifiedAt: hoursAgo(0) }, NOW)).toBe(true);
  });

  it("J5.S4.c1 re-checks an opening that has never been verified", () => {
    expect(needsRevalidation({ availability: "verified_open", evidenceTier: null, lastVerifiedAt: null }, NOW)).toBe(true);
  });
});
