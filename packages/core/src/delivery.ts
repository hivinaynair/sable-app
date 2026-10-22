const HOUR_MS = 60 * 60 * 1000;

/** Default grace window for a missed or interrupted run (D74). */
export const DEFAULT_GRACE_MS = 6 * HOUR_MS;

/**
 * The send idempotency key (D22, D75). It is derived from the scheduled local
 * date, not the attempt, so a retry or a late send for the same day reuses the key
 * and the next day's run never collides with it.
 */
export function sendKey(subscriberId: string, localDate: string): string {
  return `digest:${subscriberId}:${localDate}`;
}

export type MissedRunAction = "send_late" | "fold_into_next";

/** What to do with a scheduled delivery that did not complete on time (D74). */
export function missedRunAction(scheduledAt: Date, now: Date, graceMs = DEFAULT_GRACE_MS): MissedRunAction {
  return now.getTime() - scheduledAt.getTime() <= graceMs ? "send_late" : "fold_into_next";
}

export interface ShortfallState {
  /** Consecutive runs, before this one, that found no new strong matches. */
  consecutiveEmptyRuns: number;
}

/** Only the first empty run in a row sends a shortfall notice; later ones stay silent (D60). */
export function shouldSendShortfallNotice(state: ShortfallState): boolean {
  return state.consecutiveEmptyRuns === 0;
}

export function nextShortfallState(state: ShortfallState, foundMatches: boolean): ShortfallState {
  return { consecutiveEmptyRuns: foundMatches ? 0 : state.consecutiveEmptyRuns + 1 };
}
