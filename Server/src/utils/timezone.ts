/**
 * Timezone utilities for store-scoped "today" window calculations.
 *
 * Uses Intl.DateTimeFormat only — no external dependencies.
 * Falls back to "Africa/Tripoli" for invalid/empty IANA timezone strings.
 */

const FALLBACK_TIMEZONE = "Africa/Tripoli";

export interface DayBoundsUtc {
  startUtc: Date;
  endUtc: Date;
}

/**
 * Returns true if `tz` is a valid IANA timezone identifier.
 * Detection relies on Intl.DateTimeFormat throwing a RangeError for invalid zones.
 */
function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts year/month/day in the given IANA timezone as numbers.
 */
function getLocalYMD(
  tz: string,
  at: Date,
): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

/**
 * Returns the UTC instant that corresponds to local 00:00:00.000 on
 * year-month-day in the given IANA timezone.
 *
 * Strategy: guess `Date.UTC(y, m-1, d)` (which is correct iff the offset is 0),
 * read what that guess looks like in the target timezone, compute the delta in
 * minutes (day delta + time-of-day), and subtract it. One pass is sufficient
 * for any IANA offset (including DST half-hour offsets), because the answer is
 * the unique fixed point of the offset function within ±26 hours.
 */
function localMidnightToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const guess = new Date(guessUtcMs);
  const local = getLocalYMD(tz, guess);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(guess);
  const localHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const localMinute = Number(
    parts.find((p) => p.type === "minute")?.value ?? "0",
  );
  const targetUtcDay = Date.UTC(year, month - 1, day);
  const localUtcDay = Date.UTC(local.year, local.month - 1, local.day);
  const dayDeltaMs = localUtcDay - targetUtcDay;
  const localTimeMs = (localHour * 60 + localMinute) * 60_000;
  return new Date(guessUtcMs - dayDeltaMs - localTimeMs);
}

/**
 * Returns the UTC half-open interval [startUtc, endUtc) corresponding to
 * the calendar day in `timezone` that contains `now`. `endUtc` is the start
 * of the NEXT local day in the same timezone.
 *
 * If `timezone` is null, empty, or not a valid IANA timezone identifier,
 * the helper falls back to "Africa/Tripoli".
 *
 * The "+26h" hop trick when computing the next day is DST-safe: a local
 * civil day may be 23, 24, or 25 hours long, and 26h is guaranteed to land
 * past midnight regardless.
 */
export function getStoreDayBoundsUtc(
  timezone: string | null | undefined,
  now: Date = new Date(),
): DayBoundsUtc {
  const tz = isValidTimeZone(timezone) ? timezone : FALLBACK_TIMEZONE;

  const today = getLocalYMD(tz, now);
  const startUtc = localMidnightToUtc(tz, today.year, today.month, today.day);

  const startPlus26h = new Date(startUtc.getTime() + 26 * 60 * 60_000);
  const next = getLocalYMD(tz, startPlus26h);
  const endUtc = localMidnightToUtc(tz, next.year, next.month, next.day);

  return { startUtc, endUtc };
}
