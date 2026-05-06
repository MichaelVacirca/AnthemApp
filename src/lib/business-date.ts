// A bar's business day rolls over at 6 AM local time. Anything checked in
// between midnight and 6 AM still belongs to the previous day's shift.
const ROLLOVER_HOUR = 6;

export function businessDateFor(date: Date = new Date()): string {
  const local = new Date(date);
  if (local.getHours() < ROLLOVER_HOUR) {
    local.setDate(local.getDate() - 1);
  }
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatBusinessDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
