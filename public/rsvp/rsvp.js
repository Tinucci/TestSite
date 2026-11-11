const form = document.querySelector('form[name="event-rsvp"]');
const dates = [...form.querySelectorAll('[data-available-day]')];
const none = form.elements.namedItem('no-availability');
const remember = document.querySelector('#remember-response');
const note = document.querySelector('#response-note');
const storageKey = 'the-open-room.rsvp.v1';
const answerFields = [...form.elements].filter((field) =>
  field.name && field.name !== 'form-name' && field.name !== 'bot-field'
);

try {
  const previous = JSON.parse(localStorage.getItem(storageKey));
  if (previous && typeof previous === 'object') {
    for (const field of answerFields) {
      if (field.type === 'checkbox') {
        field.checked = previous[field.name] === field.value;
      } else if (typeof previous[field.name] === 'string') {
        field.value = previous[field.name];
      }
    }
    note.textContent = 'Your last answers are filled in. Send the form again to share your changes.';
    note.hidden = false;
  }
  document.querySelector('#remember-option').hidden = false;
} catch {
  // Storage may be unavailable. The form can still be submitted.
}

form.addEventListener('change', ({ target }) => {
  if (target === none && none.checked) {
    for (const date of dates) date.checked = false;
  } else if (dates.includes(target) && target.checked) {
    none.checked = false;
  }
  none.setCustomValidity('');
});

form.addEventListener('submit', (event) => {
  if (!none.checked && !dates.some((date) => date.checked)) {
    event.preventDefault();
    none.setCustomValidity('Select at least one full day, or choose “None of these dates work for me”.');
    none.reportValidity();
    return;
  }

  try {
    if (remember.checked) {
      const data = new FormData(form);
      const answers = Object.fromEntries(answerFields.map(({ name }) => [name, data.get(name)]));
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // Storage failure should never interrupt a guest response.
  }
});
