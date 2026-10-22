import { describe, expect, it } from "vitest";
import { nextDelivery, validateSchedule, type DeliverySchedule } from "../src/schedule";

const daily = (timezone: string, localTime = "08:00"): DeliverySchedule => ({ localTime, timezone, days: [1, 2, 3, 4, 5, 6, 7] });

describe("delivery schedule", () => {
  it("J4.S3.c3 rejects a timezone that is not a valid IANA identifier", () => {
    expect(validateSchedule(daily("Singapore Time"))).toContain("invalid_timezone");
    expect(validateSchedule(daily("Asia/Singapore"))).toEqual([]);
  });

  it("J4.S3.c6 rejects a schedule with no delivery days", () => {
    expect(validateSchedule({ localTime: "08:00", timezone: "Asia/Singapore", days: [] })).toContain("no_days");
  });

  it("J4.S3.c2 delivers at the subscriber's local time, not UTC", () => {
    const next = nextDelivery(daily("Asia/Singapore"), new Date("2026-10-22T00:30:00Z"));
    expect(next.at.toISOString()).toBe("2026-10-23T00:00:00.000Z");
    expect(next.localDate).toBe("2026-10-23");
  });

  it("J4.S3.c5 evaluates weekdays in the subscriber's timezone, not as the UTC day", () => {
    // Friday 20:00 UTC is already Saturday in Singapore, so a weekdays-only schedule waits for Monday.
    const weekdays: DeliverySchedule = { localTime: "08:00", timezone: "Asia/Singapore", days: [1, 2, 3, 4, 5] };
    const next = nextDelivery(weekdays, new Date("2026-10-23T20:00:00Z"));
    expect(next.localDate).toBe("2026-10-26");
    expect(next.at.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });

  it("J4.S3.c2 keeps the same local time across a daylight-saving change", () => {
    // London leaves summer time on 2026-10-25; 08:00 local moves from 07:00 UTC to 08:00 UTC.
    const before = nextDelivery(daily("Europe/London"), new Date("2026-10-24T00:00:00Z"));
    const after = nextDelivery(daily("Europe/London"), new Date("2026-10-25T00:00:00Z"));
    expect(before.at.toISOString()).toBe("2026-10-24T07:00:00.000Z");
    expect(after.at.toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });

  it("J4.S3.c2 moves a local time that does not exist on a spring-forward day past the gap", () => {
    // New York skips 02:00-03:00 on 2026-03-08.
    const next = nextDelivery(daily("America/New_York", "02:30"), new Date("2026-03-08T05:00:00Z"));
    expect(next.localDate).toBe("2026-03-08");
    expect(next.at.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("J4.S3.c2 fires once on a fall-back day when the local time occurs twice", () => {
    // New York repeats 01:00-02:00 on 2026-11-01.
    const first = nextDelivery(daily("America/New_York", "01:30"), new Date("2026-11-01T04:00:00Z"));
    const following = nextDelivery(daily("America/New_York", "01:30"), first.at);
    expect(first.localDate).toBe("2026-11-01");
    expect(following.localDate).toBe("2026-11-02");
  });
});
