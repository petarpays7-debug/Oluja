import { SITE_CONFIG } from '../config.js';

// Kontakt forma bez backenda: validacija + mailto.
export function initContact() {
  // Placeholder pravne poveznice: spriječi skok na vrh dok stranice ne postoje.
  document.querySelectorAll('[data-legal]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const which = a.dataset.legal === 'cookies' ? 'Kolačići' : 'Politika privatnosti';
      window.alert(`${which} — stranica će biti dodana uskoro.`);
    });
  });

  const form = document.getElementById('contact-form');
  if (!form) return;
  const note = document.getElementById('contact-note');

  const setError = (name, msg) => {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest('.field');
    const errEl = form.querySelector(`[data-error-for="${name}"]`);
    if (field) {
      field.classList.toggle('is-invalid', !!msg);
      field.classList.toggle('is-valid', !msg && !!input?.value.trim());
    }
    if (errEl) errEl.textContent = msg || '';
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const setNote = (msg, state) => {
    note.textContent = msg;
    note.classList.remove('is-success', 'is-error');
    if (state) note.classList.add(state);
  };

  // Živo brisanje greške čim korisnik ispravi polje.
  ['name', 'email', 'message'].forEach((n) => {
    const input = form.querySelector(`[name="${n}"]`);
    input?.addEventListener('blur', () => {
      if (input.closest('.field').classList.contains('is-invalid')) {
        validateField(n, Object.fromEntries(new FormData(form).entries()));
      }
    });
    input?.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('is-invalid')) {
        validateField(n, Object.fromEntries(new FormData(form).entries()));
      }
    });
  });

  function validateField(name, data) {
    if (name === 'name') {
      setError('name', data.name.trim() ? '' : 'Unesite ime i prezime.');
    } else if (name === 'email') {
      setError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? '' : 'Unesite ispravan e-mail.');
    } else if (name === 'message') {
      setError('message', data.message.trim().length >= 10 ? '' : 'Poruka je prekratka (min. 10 znakova).');
    }
  }

  const validate = (data) => {
    let ok = true;
    if (!data.name.trim()) {
      setError('name', 'Unesite ime i prezime.');
      ok = false;
    } else setError('name', '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('email', 'Unesite ispravan e-mail.');
      ok = false;
    } else setError('email', '');

    if (data.message.trim().length < 10) {
      setError('message', 'Poruka je prekratka (min. 10 znakova).');
      ok = false;
    } else setError('message', '');

    return ok;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (!validate(data)) {
      setNote('Provjerite označena polja prije slanja.', 'is-error');
      const firstInvalid = form.querySelector('.is-invalid input, .is-invalid textarea');
      firstInvalid?.focus();
      return;
    }

    const subject = `Upit za projekt — ${data.company || data.name}`;
    const body = [
      `Ime i prezime: ${data.name}`,
      `Tvrtka: ${data.company || '-'}`,
      `E-mail: ${data.email}`,
      `Vrsta projekta: ${data.type}`,
      `Okvirni budžet: ${data.budget}`,
      '',
      'Poruka:',
      data.message
    ].join('\n');

    const mailto = `mailto:${SITE_CONFIG.company.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setNote(
      'Otvorili smo vašu e-mail aplikaciju s pripremljenim upitom — preostaje samo kliknuti „Pošalji”. Ako se ne otvori, pišite izravno na ' +
        SITE_CONFIG.company.email + '.',
      'is-success'
    );
  });
}
