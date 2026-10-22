import type { Opening } from "./types";

const HOUR_MS = 60 * 60 * 1000;

/** Trust windows by evidence source (D70). */
export const FRESHNESS_WINDOW_MS = {
  feed: 48 * HOUR_MS,
  browser: 24 * HOUR_MS,
} as const;

/** Whether an opening must be re-verified before it can go into a digest (J5.S4.c1). */
export function needsRevalidation(
  o: Pick<Opening, "availability" | "evidenceTier" | "lastVerifiedAt">,
  now: Date,
): boolean {
  if (o.availability === "confirmed_closed") return false;
  if (o.availability === "uncertain") return true;
  if (o.lastVerifiedAt === null || o.evidenceTier === null) return true;
  return now.getTime() - o.lastVerifiedAt.getTime() > FRESHNESS_WINDOW_MS[o.evidenceTier];
}
