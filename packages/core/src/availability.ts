import type { Availability, EvidenceTier } from "./types";

/** What a retrieval attempt actually observed. */
export type RetrievalOutcome =
  | { kind: "feed"; listed: boolean; complete: boolean }
  | { kind: "http_error"; status: number }
  | { kind: "timeout" }
  | { kind: "captcha" }
  | { kind: "blank_page" }
  | {
      kind: "page";
      requisitionMatches: boolean;
      closureNotice: boolean;
      applicationFormSeen: boolean;
      loginRequired: boolean;
    };

export interface Classification {
  availability: Availability;
  evidenceTier: EvidenceTier | null;
}

const UNCERTAIN: Classification = { availability: "uncertain", evidenceTier: null };

/**
 * Turns an observed retrieval outcome into one of the three states (D9). This is
 * the code guard around any model judgement (D87): blocked or ambiguous outcomes
 * are uncertain here before a model could ever call them closed.
 */
export function classifyOutcome(outcome: RetrievalOutcome): Classification {
  switch (outcome.kind) {
    case "feed":
      if (outcome.listed) return { availability: "verified_open", evidenceTier: "feed" };
      // Absence only proves closure when the employer's whole feed was read (J6.S3.c4, J6.S2.c8).
      return outcome.complete ? { availability: "confirmed_closed", evidenceTier: "feed" } : UNCERTAIN;

    case "http_error":
    case "timeout":
    case "captcha":
    case "blank_page":
      // A 403, a CAPTCHA, a blank page or a single 404 is not proof of closure (J6.S4.c7).
      return UNCERTAIN;

    case "page": {
      if (!outcome.requisitionMatches) return UNCERTAIN;
      if (outcome.closureNotice) return { availability: "confirmed_closed", evidenceTier: "browser" };
      // An Apply button alone is not proof; a form must have been seen and not gated by login (J6.S4.c4, D27).
      if (outcome.applicationFormSeen && !outcome.loginRequired) {
        return { availability: "verified_open", evidenceTier: "browser" };
      }
      return UNCERTAIN;
    }
  }
}
