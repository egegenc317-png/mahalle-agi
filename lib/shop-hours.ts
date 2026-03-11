export type BusinessClosedHour = {
  day: number;
  mode: "FULL_DAY" | "RANGE";
  start?: string;
  end?: string;
};

export function parseTime(value: string) {
  const [hh, mm] = value.split(":").map((part) => Number(part));
  return hh * 60 + mm;
}

export function getIstanbulNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value || "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return { day: weekdayMap[weekday] ?? 0, minutes: hour * 60 + minute };
}

export function getClosedStatus(
  schedule: BusinessClosedHour[] | null | undefined,
  day: number,
  nowMinutes: number
) {
  if (!schedule || schedule.length === 0) {
    return { isClosed: false, label: "Acik" };
  }

  const todayRule = schedule.find((item) => item.day === day);
  if (!todayRule) {
    return { isClosed: false, label: "Acik" };
  }

  if (todayRule.mode === "FULL_DAY") {
    return { isClosed: true, label: "Kapali (tum gun)" };
  }

  if (!todayRule.start || !todayRule.end) {
    return { isClosed: false, label: "Acik" };
  }

  const start = parseTime(todayRule.start);
  const end = parseTime(todayRule.end);
  const inRange = start <= end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;

  if (!inRange) {
    return { isClosed: false, label: "Acik" };
  }

  return { isClosed: true, label: `Kapali (${todayRule.start}-${todayRule.end})` };
}

