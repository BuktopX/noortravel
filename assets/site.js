// Contact details live here so they change in one place.
const WHATSAPP_NUMBER = '77073398432';
const PHONE_NUMBER = '+77073398432';

// Every link with data-wa opens WhatsApp with that message already typed,
// so the manager sees which tour (and which page) the person came from.
document.querySelectorAll('[data-wa]').forEach((link) => {
  const text = link.dataset.wa;
  link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  link.target = '_blank';
  link.rel = 'noopener';
});

document.querySelectorAll('[data-tel]').forEach((link) => {
  link.href = `tel:${PHONE_NUMBER}`;
});

// Tour pill (desktop): appears once the hero has scrolled away, hides again at the final call to action and footer
const pill = document.querySelector('.tour-pill');
if (pill) {
  const watched = [document.querySelector('.tour-hero'), document.getElementById('contacts'), document.querySelector('.site-footer')].filter(Boolean);
  const inView = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target)));
    pill.classList.toggle('is-shown', inView.size === 0);
  });
  watched.forEach((el) => io.observe(el));
}

// Photo carousels: native swipe/scroll with snap; arrows move one photo, the counter follows the scroll.
document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.children];
  const prev = carousel.querySelector('[data-prev]');
  const next = carousel.querySelector('[data-next]');
  const count = carousel.querySelector('.carousel-count');
  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const pad = (n) => String(n).padStart(2, '0');

  const current = () => {
    const step = (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : 0) || 1;
    return Math.min(slides.length - 1, Math.round(track.scrollLeft / step));
  };
  const atEnd = () => track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  let shown = -1;
  const refresh = () => {
    // The last photo can't scroll to the left edge, so at the very end count it as current
    const i = atEnd() ? slides.length - 1 : current();
    // Only touch the (aria-live) counter when the photo changes, so screen readers announce it once
    if (count && i !== shown) {
      count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      count.setAttribute('aria-label', `Фото ${i + 1} из ${slides.length}`);
      shown = i;
    }
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = atEnd();
  };
  const go = (dir) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, current() + dir))];
    track.scrollTo({ left: target.offsetLeft - slides[0].offsetLeft, behavior: smooth });
  };

  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));
  track.addEventListener('scroll', refresh, { passive: true });
  addEventListener('resize', refresh);
  refresh();
});
