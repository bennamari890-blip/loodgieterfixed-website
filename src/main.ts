const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
const heroMedia = document.getElementById('heroMedia');
const year = document.getElementById('year');
const quoteForm = document.getElementById('quoteForm') as HTMLFormElement | null;
const formNote = document.getElementById('formNote');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroSlides = [...document.querySelectorAll<HTMLElement>('.hero-slide')];
const sliderDots = [...document.querySelectorAll<HTMLElement>('.slider-dots span')];

if (year) {
  year.textContent = new Date().getFullYear().toString();
}

if (nav) {
  const updateNav = () => {
    nav.classList.toggle('scrolled', window.scrollY > 18);
  };

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });
}

if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      document.body.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

const revealEls = [...document.querySelectorAll<HTMLElement>('.reveal')];
document.querySelectorAll<HTMLElement>('.service').forEach((el, i) => {
  el.style.setProperty('--delay', `${(i % 2) * 90}ms`);
});

if ('IntersectionObserver' in window && !reduced) {
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.13, rootMargin: '0px 0px -50px 0px' },
  );

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

const counters = [...document.querySelectorAll<HTMLElement>('[data-count]')];
let countersDone = false;

function animateCounter(el: HTMLElement) {
  const end = Number(el.dataset.count || 0);
  const suffix = el.dataset.suffix || '';

  if (reduced) {
    el.textContent = end.toLocaleString('nl-NL') + suffix;
    return;
  }

  const start = performance.now();
  const duration = 1200;

  function tick(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(end * eased).toLocaleString('nl-NL') + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

if (counters.length && 'IntersectionObserver' in window) {
  const counterRoot = counters[0].closest('.stats-list');
  const counterObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !countersDone) {
        countersDone = true;
        counters.forEach(animateCounter);
        counterObserver.disconnect();
      }
    },
    { threshold: 0.35 },
  );

  if (counterRoot) {
    counterObserver.observe(counterRoot);
  }
} else {
  counters.forEach(animateCounter);
}

if (!reduced && heroMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
  heroMedia.addEventListener('pointermove', (event) => {
    const rect = heroMedia.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    heroMedia.style.transform = `perspective(900px) rotateY(${x * 0.35}deg) rotateX(${-y * 0.25}deg)`;
  });

  heroMedia.addEventListener('pointerleave', () => {
    heroMedia.style.transform = '';
  });
}

if (!reduced && heroSlides.length > 1) {
  let activeSlide = 0;

  window.setInterval(() => {
    heroSlides[activeSlide].classList.remove('active');
    sliderDots[activeSlide]?.classList.remove('active');

    activeSlide = (activeSlide + 1) % heroSlides.length;

    heroSlides[activeSlide].classList.add('active');
    sliderDots[activeSlide]?.classList.add('active');
  }, 4200);
}

if (quoteForm && formNote) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = quoteForm.querySelector<HTMLButtonElement>('[type="submit"]');
    const formData = new FormData(quoteForm);
    const payload = Object.fromEntries(formData.entries());

    formNote.classList.remove('success', 'error');
    formNote.textContent = 'Je aanvraag wordt verzonden...';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Versturen...';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({ message: '' }));

      if (!response.ok) {
        throw new Error(result.message || 'Verzenden is niet gelukt.');
      }

      quoteForm.reset();
      formNote.classList.add('success');
      formNote.textContent = 'Bedankt, je aanvraag is verzonden. We nemen zo snel mogelijk contact met je op.';
    } catch (error) {
      formNote.classList.add('error');
      formNote.textContent =
        error instanceof Error
          ? error.message
          : 'Verzenden is niet gelukt. Bel ons direct of probeer het later opnieuw.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Verstuur aanvraag ->';
      }
    }
  });
}
