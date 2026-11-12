// server/utils/jakartaTime.js - Consistent Asia/Jakarta (WIB) Date & Time Helpers

/**
 * Returns authoritative wall-clock parts in Asia/Jakarta regardless of server UTC timezone.
 */
export function getJakartaNow(referenceDate = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false
  });

  const parts = {};
  for (const p of dtf.formatToParts(referenceDate)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }

  // Normalize midnight '24' emitted by some ICU engines
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    timeStr: `${hour}:${parts.minute}:${parts.second}`,
    dayOfWeek: weekdayMap[parts.weekday] ?? 1
  };
}

/**
 * Formats a Date or YYYY-MM-DD value as YYYY-MM-DD in Asia/Jakarta without UTC off-by-one shifts.
 */
export function formatJakartaDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    // Plain DATE string (YYYY-MM-DD) is already calendar date
    const match = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

/**
 * Subtracts `daysBack` calendar days from a YYYY-MM-DD string safely in UTC-noon math.
 */
export function shiftDateStr(dateStr, daysDelta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysDelta, 12, 0, 0));
  return {
    dateStr: dt.toISOString().slice(0, 10),
    dayOfWeek: dt.getUTCDay()
  };
}
