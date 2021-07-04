import { DateTime } from "luxon";

export const isLessThanAWeekOld = (isoReadyDateString: string) => {
  const date = DateTime.fromISO(isoReadyDateString, { zone: "utc" });
  const oneWeekAgo = DateTime.utc().minus({ weeks: 1, minutes: 5 }); // with a buffer because I don't trust computerss

  return date > oneWeekAgo;
};
