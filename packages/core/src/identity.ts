import type { Opening } from "./types";

/**
 * The exact-opening identity used for deduplication and history (D17). It is
 * per requisition, not per employer, so a different requisition at the same
 * employer is a different opening.
 */
export function openingIdentity(o: Pick<Opening, "employerId" | "requisitionId" | "canonicalUrl">): string {
  return o.requisitionId !== null
    ? `${o.employerId}:req:${o.requisitionId}`
    : `${o.employerId}:url:${normalizeUrl(o.canonicalUrl)}`;
}

function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString().replace(/\/$/, "");
}

/**
 * Collapses listings of one opening found through different sources into a
 * single candidate (J5.S3.c2), keeping the best-verified one and every source URL.
 */
export function collapseEquivalents(openings: Opening[]): Opening[] {
  const byIdentity = new Map<string, Opening>();
  for (const o of openings) {
    const key = openingIdentity(o);
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, { ...o, sourceUrls: [...o.sourceUrls] });
      continue;
    }
    const best = isBetterEvidence(o, existing) ? o : existing;
    byIdentity.set(key, {
      ...best,
      sourceUrls: [...new Set([...existing.sourceUrls, ...o.sourceUrls])],
    });
  }
  return [...byIdentity.values()];
}

function isBetterEvidence(a: Opening, b: Opening): boolean {
  const rank = (o: Opening) => (o.availability === "verified_open" ? 2 : o.availability === "uncertain" ? 1 : 0);
  if (rank(a) !== rank(b)) return rank(a) > rank(b);
  return (a.lastVerifiedAt?.getTime() ?? 0) > (b.lastVerifiedAt?.getTime() ?? 0);
}
