import { formatDate } from './event-dates.mjs';

const dateLabel = document.querySelector('#best-date');
const status = document.querySelector('#date-status');

try {
  const response = await fetch('/api/best-date');
  if (!response.ok) throw new Error();
  const result = await response.json();
  if (result.date) {
    dateLabel.dateTime = result.date;
    dateLabel.textContent = formatDate(result.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const count = `${result.votes} ${result.votes === 1 ? 'guest is' : 'guests are'} available`;
    status.textContent = result.tiedDates > 1
      ? `Earliest of ${result.tiedDates} tied dates · ${count} · Tentative`
      : `Current favorite · ${count} · Tentative`;
  } else {
    status.textContent = 'No dates have votes yet. Share your availability.';
  }
} catch {
  status.textContent = 'The live tally is unavailable. The final date is to be confirmed.';
}
