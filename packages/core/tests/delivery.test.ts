import { describe, expect, it } from "vitest";
import { missedRunAction, nextShortfallState, sendKey, shouldSendShortfallNotice } from "../src/delivery";

describe("send idempotency and recovery", () => {
  it("J7.S2.c2 derives the same key for a retry or late send of the same scheduled day", () => {
    expect(sendKey("sub-1", "2026-10-22")).toBe(sendKey("sub-1", "2026-10-22"));
  });

  it("J7.S2.c1 derives different keys for different scheduled days and different subscribers", () => {
    expect(sendKey("sub-1", "2026-10-22")).not.toBe(sendKey("sub-1", "2026-10-23"));
    expect(sendKey("sub-1", "2026-10-22")).not.toBe(sendKey("sub-2", "2026-10-22"));
  });

  it("D74 sends late within the six-hour grace window and folds into the next run after it", () => {
    const scheduled = new Date("2026-10-22T00:00:00Z");
    expect(missedRunAction(scheduled, new Date("2026-10-22T06:00:00Z"))).toBe("send_late");
    expect(missedRunAction(scheduled, new Date("2026-10-22T06:00:01Z"))).toBe("fold_into_next");
  });
});

describe("shortfall notice", () => {
  it("D60 sends a notice on the first empty run and stays silent on the following ones", () => {
    let state = { consecutiveEmptyRuns: 0 };
    const notices: boolean[] = [];
    for (let run = 0; run < 3; run++) {
      notices.push(shouldSendShortfallNotice(state));
      state = nextShortfallState(state, false);
    }
    expect(notices).toEqual([true, false, false]);
  });

  it("D60 resets after a run that finds matches, so the next empty streak gets one notice", () => {
    const reset = nextShortfallState({ consecutiveEmptyRuns: 4 }, true);
    expect(shouldSendShortfallNotice(reset)).toBe(true);
  });
});
