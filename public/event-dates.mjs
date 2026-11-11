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
