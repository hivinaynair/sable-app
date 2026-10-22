import { checkEligibility } from "./eligibility";
import { needsRevalidation } from "./freshness";
import { collapseEquivalents, openingIdentity } from "./identity";
import type { ExclusionReason, HardConstraints, Opening, OpeningLabel } from "./types";

export interface SubscriberHistory {
  /** Identities already delivered to this subscriber, or marked applied, contacted or not relevant. */
  seen: ReadonlySet<string>;
  /** Employers the subscriber has a recorded application or delivery at. */
  employersWithHistory: ReadonlySet<string>;
}

export interface DigestRequest {
  candidates: Opening[];
  constraints: HardConstraints;
  history: SubscriberHistory;
  /** Validated relevance scores by opening identity. A candidate without a score is dropped (J5.S5.c5). */
  scores: ReadonlyMap<string, number>;
  /** The subscriber's configured digest size, which is also the target (D67, D69). */
  size: number;
  now: Date;
}

export interface DigestItem {
  opening: Opening;
  identity: string;
  score: number;
  labels: OpeningLabel[];
}

export interface DigestResult {
  items: DigestItem[];
  target: number;
  excluded: Partial<Record<ExclusionReason, number>>;
  /** Candidates that were otherwise eligible but must be re-verified before they can be sent. */
  toRevalidate: Opening[];
  shortfall: boolean;
}

/**
 * Selects up to N strong new matches (D14). Every filter runs before ranking, and
 * the result is never padded: an opening that failed any step cannot appear (J5.S6.c2).
 */
export function selectDigest(req: DigestRequest): DigestResult {
  const excluded: Partial<Record<ExclusionReason, number>> = {};
  const exclude = (reason: ExclusionReason) => {
    excluded[reason] = (excluded[reason] ?? 0) + 1;
  };

  const survivors: DigestItem[] = [];
  const toRevalidate: Opening[] = [];

  for (const opening of collapseEquivalents(req.candidates)) {
    const eligibility = checkEligibility(opening, req.constraints);
    if (!eligibility.eligible) {
      exclude(eligibility.reason);
      continue;
    }

    const identity = openingIdentity(opening);
    if (req.history.seen.has(identity)) {
      exclude("already_seen");
      continue;
    }

    if (opening.availability === "confirmed_closed") {
      exclude("not_verified_open");
      continue;
    }
    if (needsRevalidation(opening, req.now)) {
      toRevalidate.push(opening);
      exclude("needs_revalidation");
      continue;
    }

    const score = req.scores.get(identity);
    if (score === undefined) {
      exclude("unscored");
      continue;
    }

    const labels = [...eligibility.labels];
    if (opening.reopened) labels.push("reopened");
    if (req.history.employersWithHistory.has(opening.employerId)) labels.push("different_requisition");
    survivors.push({ opening, identity, score, labels });
  }

  survivors.sort((a, b) => b.score - a.score);
  const items = survivors.slice(0, req.size);
  return { items, target: req.size, excluded, toRevalidate, shortfall: items.length < req.size };
}
