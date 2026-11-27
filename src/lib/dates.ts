/** Next rent due date (YYYY-MM-DD) after `today`, for a tenancy due on `dueDay` each month. */
export function nextDueDate(today: string, dueDay: number): string {
  const [y, m] = today.split("-").map(Number);
  const make = (yy: number, mm: number) => {
    const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(dueDay, last)).padStart(2, "0")}`;
  };
  // Only used when nothing is outstanding, so this month is settled and the next charge is next month.
  return m === 12 ? make(y + 1, 1) : make(y, m + 1);
}
