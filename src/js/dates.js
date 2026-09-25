// Helper utilities for date and time calculations in Asia/Tokyo timezone

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function formatMonthKey(year, monthIndex) {
  const m = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${m}`;
}

export function formatDateKey(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationHours(startTime, endTime, breakMinutes = 0) {
  const start = parseTimeMinutes(startTime);
  const end = parseTimeMinutes(endTime);
  const total = Math.max(0, end - start - breakMinutes);
  return total / 60;
}

export function getJapaneseDayOfWeek(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}
