export const firstMonth = '2026-11';
export const lastMonth = '2027-02';

export function isEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value < firstMonth + '-01' || value > lastMonth + '-31') return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function formatDate(value, options) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' })
    .format(new Date(value + 'T00:00:00Z'));
}

export const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function adjacentMonth(month, offset) {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function monthCells(month) {
  const start = new Date(month + '-01T00:00:00Z');
  const offset = (start.getUTCDay() + 6) % 7;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const dates = Array.from({ length: end.getUTCDate() }, (_, index) =>
    month + '-' + String(index + 1).padStart(2, '0'));
  return [...Array(offset).fill(null), ...dates];
}
