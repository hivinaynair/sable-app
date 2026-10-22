import { DateTime, IANAZone } from "luxon";

/** ISO weekday: 1 is Monday, 7 is Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DeliverySchedule {
  /** Local time of day, "HH:mm" (D19). */
  localTime: string;
  /** IANA timezone identifier, e.g. "Asia/Singapore" (D19). */
  timezone: string;
  /** Delivery days in the subscriber's own timezone (D76). */
  days: Weekday[];
}

export type ScheduleError = "invalid_time" | "invalid_timezone" | "no_days";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateSchedule(s: DeliverySchedule): ScheduleError[] {
  const errors: ScheduleError[] = [];
  if (!TIME.test(s.localTime)) errors.push("invalid_time");
  if (!IANAZone.isValidZone(s.timezone)) errors.push("invalid_timezone");
  if (s.days.length === 0) errors.push("no_days");
  return errors;
}

export interface ScheduledDelivery {
  at: Date;
  /** The subscriber's local calendar date this delivery belongs to, "YYYY-MM-DD". */
  localDate: string;
}

/**
 * The first scheduled delivery strictly after `after`. The delivery day is the
 * subscriber's local day, never the UTC day (D76). A local time that does not
 * exist on a spring-forward day is moved forward past the gap; a time that occurs
 * twice on a fall-back day fires once, at its first occurrence.
 */
export function nextDelivery(s: DeliverySchedule, after: Date): ScheduledDelivery {
  const invalid = validateSchedule(s);
  if (invalid.length > 0) throw new Error(`Invalid schedule: ${invalid.join(", ")}`);

  const [hour, minute] = s.localTime.split(":").map(Number) as [number, number];
  const start = DateTime.fromJSDate(after, { zone: s.timezone }).startOf("day");

  for (let offset = 0; offset <= 7; offset++) {
    const day = start.plus({ days: offset });
    if (!s.days.includes(day.weekday as Weekday)) continue;
    const at = DateTime.fromObject(
      { year: day.year, month: day.month, day: day.day, hour, minute },
      { zone: s.timezone },
    );
    if (at.toMillis() > after.getTime()) {
      return { at: at.toJSDate(), localDate: day.toISODate()! };
    }
  }
  throw new Error("unreachable: a non-empty weekday set recurs within eight days");
}
