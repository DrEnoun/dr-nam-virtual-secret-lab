// Small shared UI helpers.
export function toast(text, ms = 3200) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Brief pressed look when a button is selected by a hand (mouse users see :active). */
export function pressFlash(el) {
  el.classList.add('is-pressed');
  setTimeout(() => el.classList.remove('is-pressed'), 140);
}

/** If a logo file is missing, show a labelled placeholder instead of a broken image. */
export function guardLogos(root = document) {
  root.querySelectorAll('img[data-logo]').forEach(img => {
    const swap = () => {
      if (img.dataset.swapped) return;
      img.dataset.swapped = '1';
      const ph = document.createElement('span');
      ph.className = 'logo-missing';
      ph.textContent = `Add logo: ${img.dataset.logo}`;
      img.replaceWith(ph);
    };
    if (img.complete && img.naturalWidth === 0) swap();
    else img.addEventListener('error', swap, { once: true });
  });
}
