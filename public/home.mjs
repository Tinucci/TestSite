import { firstMonth, lastMonth, formatDate, weekdays, adjacentMonth, monthCells } from './event-dates.mjs';

const dateLabel = document.querySelector('#best-date');
const status = document.querySelector('#date-status');
const availabilityStatus = document.querySelector('#availability-status');
const grid = document.querySelector('#availability-grid');
const previous = document.querySelector('#previous-availability-month');
const next = document.querySelector('#next-availability-month');
const fullDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
let availability = {};
let month = firstMonth;

function showDay(date) {
  const { votes = 0, aliases = [] } = availability[date] ?? {};
  document.querySelector('#availability-day').textContent = formatDate(date, fullDate);
  document.querySelector('#availability-count').textContent = votes
    ? `${votes} ${votes === 1 ? 'guest is' : 'guests are'} available.`
    : 'No availability submitted for this date.';
  const list = document.querySelector('#availability-aliases');
  list.replaceChildren(...aliases.map((alias) => {
    const item = document.createElement('li');
    item.textContent = alias;
    return item;
  }));
  list.hidden = !aliases.length;
  const unnamed = votes - aliases.length;
  const note = document.querySelector('#availability-private');
  note.hidden = unnamed < 1;
  note.textContent = unnamed === 1 ? '1 guest hasn’t shared a character name yet.' : `${unnamed} guests haven’t shared character names yet.`;

  grid.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
  grid.querySelector(`[data-date="${date}"]`)?.setAttribute('aria-pressed', 'true');
}

function renderMonth(selectedDate = month + '-01') {
  document.querySelector('#availability-month').textContent = formatDate(month + '-01', { month: 'long', year: 'numeric' });
  previous.disabled = month === firstMonth;
  next.disabled = month === lastMonth;
  const cells = document.createDocumentFragment();
  for (const day of weekdays) {
    const heading = document.createElement('abbr');
    heading.textContent = day;
    cells.append(heading);
  }
  for (const date of monthCells(month)) {
    if (!date) {
      cells.append(document.createElement('span'));
      continue;
    }
    const votes = availability[date]?.votes ?? 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'availability-date';
    button.dataset.date = date;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${formatDate(date, fullDate)}, ${votes} available`);
    button.textContent = Number(date.slice(-2));
    if (votes) {
      const count = document.createElement('span');
      count.textContent = votes;
      count.className = 'availability-votes';
      button.append(count);
    }
    button.addEventListener('click', () => showDay(date));
    cells.append(button);
  }
  grid.replaceChildren(cells);
  showDay(selectedDate);
}

previous.addEventListener('click', () => {
  month = adjacentMonth(month, -1);
  renderMonth();
});
next.addEventListener('click', () => {
  month = adjacentMonth(month, 1);
  renderMonth();
});

try {
  const response = await fetch('/api/best-date');
  if (!response.ok) throw new Error();
  const result = await response.json();
  availability = result.availability ?? {};
  month = result.date?.slice(0, 7) ?? firstMonth;
  renderMonth(result.date ?? undefined);
  document.querySelector('#availability-calendar').hidden = false;
  availabilityStatus.hidden = true;
  if (result.date) {
    dateLabel.dateTime = result.date;
    dateLabel.textContent = formatDate(result.date, fullDate);
    const count = `${result.votes} ${result.votes === 1 ? 'guest is' : 'guests are'} available`;
    status.textContent = result.tiedDates > 1
      ? `Earliest of ${result.tiedDates} tied dates · ${count} · Tentative`
      : `Current favorite · ${count} · Tentative`;
  } else {
    status.textContent = 'No dates have votes yet. Share your availability.';
  }
} catch {
  availabilityStatus.textContent = 'Guest availability is temporarily unavailable.';
  status.textContent = 'The live tally is unavailable. The final date is to be confirmed.';
}
