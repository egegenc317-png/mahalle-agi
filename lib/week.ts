export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-based week
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

export function getWeekKey(date = new Date()) {
  const start = getWeekStart(date);
  const year = start.getFullYear();
  const firstWeekStart = getWeekStart(new Date(year, 0, 4));
  const diffDays = Math.floor((start.getTime() - firstWeekStart.getTime()) / (24 * 60 * 60 * 1000));
  const weekNo = Math.floor(diffDays / 7) + 1;
  return `${year}-W${String(Math.max(1, weekNo)).padStart(2, "0")}`;
}
