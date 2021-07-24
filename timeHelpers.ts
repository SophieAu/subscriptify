import { DateTime } from "luxon";
import { DatePrecision } from "./types";

const duration = {
  day: { days: 1, milliseconds: -1 },
  month: { month: 1, milliseconds: -1 },
  year: { years: 1, milliseconds: -1 },
  second: { seconds: 1, milliseconds: -1 },
};

export const isLessThanAWeekOld = (
  isoDate: string,
  precision: DatePrecision = "second"
) => {
  const date = DateTime.fromISO(isoDate, { zone: "utc" }).plus(
    duration[precision]
  );
  const oneWeekAgo = DateTime.utc().minus({ weeks: 1, minutes: 5 }); // with a buffer because I don't trust computerss

  return date > oneWeekAgo;
};
