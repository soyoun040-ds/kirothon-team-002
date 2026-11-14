export interface ScheduleInput {
  title: string;
  /** The moment the event starts. */
  startsAt: Date;
  /** The user's IANA timezone, e.g. "Asia/Seoul". */
  timeZone: string;
}

export interface SavedSchedule {
  title: string;
  /** Calendar date as "YYYY-MM-DD". */
  date: string;
  timeZone: string;
}

export function saveSchedule(input: ScheduleInput): SavedSchedule {
  // NOTE: intentional bug for the demo. This cuts the date in UTC and
  // ignores input.timeZone.
  const date = input.startsAt.toISOString().slice(0, 10);

  return {
    title: input.title,
    date,
    timeZone: input.timeZone,
  };
}
