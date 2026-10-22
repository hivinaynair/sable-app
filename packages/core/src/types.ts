export type Availability = "verified_open" | "confirmed_closed" | "uncertain";

/** Which kind of evidence produced the current availability state (D70, D71). */
export type EvidenceTier = "feed" | "browser";

export type Sponsorship = "offered_explicitly" | "explicitly_not_offered" | "not_stated";

export type RemoteScope = "worldwide_stated" | "restricted_to_regions" | "not_stated";

export type WorkArrangement = "remote" | "hybrid" | "on_site";

export interface Opening {
  employerId: string;
  /** Null when the source publishes no requisition id; identity then falls back to the canonical URL. */
  requisitionId: string | null;
  canonicalUrl: string;
  sourceUrls: string[];
  title: string;
  /** Null when the listing does not say. Unknown is never treated as a match (D16). */
  arrangement: WorkArrangement | null;
  /** ISO 3166-1 alpha-2 countries where an on-site or hybrid role is located. */
  locations: string[];
  remoteScope: RemoteScope;
  /** ISO countries a remote role is restricted to; meaningful only when remoteScope is restricted_to_regions. */
  remoteRegions: string[];
  sponsorship: Sponsorship;
  availability: Availability;
  evidenceTier: EvidenceTier | null;
  lastVerifiedAt: Date | null;
  /** Four distinct dates (D10). A changed updatedAt never makes a new vacancy. */
  publishedAt: Date | null;
  updatedAt: Date | null;
  firstSeenAt: Date;
  /** True when this requisition was previously confirmed closed and has reappeared. */
  reopened: boolean;
}

export interface HardConstraints {
  /** Acceptable arrangements; empty means any. */
  arrangements: WorkArrangement[];
  /** Countries the subscriber can work in; empty means no location constraint. */
  countries: string[];
  requiresSponsorship: boolean;
  /** Opt-in to see openings whose sponsorship is not stated, labelled as unknown (D92). */
  includeUnknownSponsorship: boolean;
  excludedEmployerIds: string[];
}

export type ExclusionReason =
  | "employer_excluded"
  | "arrangement_mismatch"
  | "arrangement_unknown"
  | "location_mismatch"
  | "remote_region_mismatch"
  | "remote_region_unknown"
  | "sponsorship_not_offered"
  | "sponsorship_unknown"
  | "already_seen"
  | "not_verified_open"
  | "needs_revalidation"
  | "unscored";

export type OpeningLabel = "sponsorship_unknown" | "reopened" | "different_requisition";
