/** "YYYY-MM-DD" with no time, as an HTML date input sends it. */
export const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const TORONTO = "America/Toronto";

const torontoParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TORONTO,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Toronto's offset from UTC at this moment, in ms (EST -5 h, EDT -4 h). */
function torontoOffsetMs(at: number): number {
  const part = (type: string) => Number(torontoParts.formatToParts(at).find((p) => p.type === type)?.value);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wall - Math.floor(at / 1000) * 1000;
}

/**
 * "2026-12-01" to 23:59:59 that day in Toronto, as a Date. Returns an invalid
 * Date for a day that does not exist (e.g. "2027-02-30"). DST changes happen
 * at 2 am, so the offset at the end of the day is the one to use.
 */
export function endOfDayInToronto(dateOnly: string): Date {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return new Date(NaN);

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const wall = Date.UTC(year, month - 1, day, 23, 59, 59);
  const check = new Date(wall);

  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return new Date(NaN);
  }

  return new Date(wall - torontoOffsetMs(wall - torontoOffsetMs(wall)));
}
