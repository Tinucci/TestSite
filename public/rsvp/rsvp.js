import { firstMonth, lastMonth, formatDate, weekdays, adjacentMonth, monthCells } from '../event-dates.mjs';

const inviteForm = document.querySelector('#invite-form');
const form = document.querySelector('#response-form');
const notice = document.querySelector('#notice');
const saveStatus = document.querySelector('#save-status');
const signOut = document.querySelector('#sign-out');
const calendar = document.querySelector('#calendar-grid');
const previous = document.querySelector('#prev-month');
const next = document.querySelector('#next-month');
const selected = new Set();
const fields = ['alias', 'characterNotes', 'refreshments', 'location'];
let month = firstMonth;

function moveMonth(offset) {
  month = adjacentMonth(month, offset);
  renderCalendar();
}

function updateCount() {
  document.querySelector('#date-count').textContent =
    `${selected.size} ${selected.size === 1 ? 'day' : 'days'} selected across all months`;
}

function renderCalendar() {
  document.querySelector('#calendar-month').textContent = formatDate(month + '-01', { month: 'long', year: 'numeric' });
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
    const label = document.createElement('label');
    label.className = 'calendar-day';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = date;
    checkbox.checked = selected.has(date);
    checkbox.setAttribute('aria-label', formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    const number = document.createElement('span');
    number.textContent = Number(date.slice(-2));
    label.append(checkbox, number);
    cells.append(label);
  }
  calendar.replaceChildren(cells);
  updateCount();
}

calendar.addEventListener('change', ({ target }) => {
  if (target.checked) selected.add(target.value);
  else selected.delete(target.value);
  updateCount();
});
previous.addEventListener('click', () => moveMonth(-1));
next.addEventListener('click', () => moveMonth(1));

async function request(method, body) {
  const response = await fetch('/api/rsvp', {
    method,
    ...(body && { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The RSVP service is unavailable. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function showInvite(message = '') {
  notice.textContent = message;
  form.hidden = true;
  signOut.hidden = true;
  inviteForm.hidden = false;
}

function showResponse(response) {
  form.reset();
  selected.clear();
  for (const date of response?.dates ?? []) selected.add(date);
  for (const key of fields) form.elements.namedItem(key).value = response?.[key] ?? '';
  month = response?.dates?.[0]?.slice(0, 7) ?? firstMonth;
  renderCalendar();
  inviteForm.reset();
  inviteForm.hidden = true;
  notice.textContent = response && !response.alias
    ? 'Add a fictional character name to show your alias on the availability calendar.'
    : response ? 'Your saved RSVP is ready to edit.' : '';
  saveStatus.textContent = '';
  form.hidden = false;
  signOut.hidden = false;
}

inviteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  event.submitter.disabled = true;
  try {
    const { response } = await request('POST', { code: inviteForm.elements.code.value });
    showResponse(response);
    form.elements.alias.focus();
  } catch (error) {
    notice.textContent = error.message;
  } finally {
    event.submitter.disabled = false;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  event.submitter.disabled = true;
  const data = new FormData(form);
  const answers = Object.fromEntries(fields.map((key) => [key, data.get(key) ?? '']));
  saveStatus.textContent = 'Saving…';
  try {
    await request('PUT', { ...answers, dates: [...selected] });
    saveStatus.textContent = 'RSVP saved. You can come back to update it.';
  } catch (error) {
    if (error.status === 401) showInvite('Your session expired. Enter your invite code again.');
    else saveStatus.textContent = error.message;
  } finally {
    event.submitter.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  try {
    await request('DELETE');
    form.reset();
    selected.clear();
    showInvite('You’re signed out.');
  } catch (error) {
    notice.textContent = error.message;
  }
});

try {
  const { response } = await request('GET');
  showResponse(response);
} catch (error) {
  showInvite(error.status === 401 ? '' : error.message);
}
