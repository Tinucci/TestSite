const control = document.querySelector('[data-motion-toggle]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const key = 'elsewhere-motion-paused';
let paused = false;

try {
  paused = localStorage.getItem(key) === 'true';
} catch {
  // The page control still works when storage is unavailable.
}

function updateMotion() {
  document.documentElement.toggleAttribute('data-motion-paused', paused);
  control.textContent = paused ? 'Resume motion' : 'Pause motion';
  control.hidden = reduced.matches;
}

control.addEventListener('click', () => {
  paused = !paused;
  try {
    localStorage.setItem(key, String(paused));
  } catch {
    // Keep the preference for this page.
  }
  updateMotion();
});

reduced.addEventListener('change', updateMotion);
updateMotion();
