function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(str) {
  return esc(str)
    .replace(/(\d) (?=\d{3}\b)/g, '$1&nbsp;')
    .replace(/(\d) (?=[₸$₽€])/g, '$1&nbsp;');
}

function waHref(site, text) {
  return `https://wa.me/${site.contacts.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>'
};

function renderHeader(site, { isTour = false, waText, ctaLabel = 'WhatsApp' }) {
  const prefix = isTour ? '../' : '';
  const navPrefix = isTour ? '../index.html' : '';
  const langSoon = site.showKazakhSoon
    ? '\n        <span class="soon" title="Казахская версия в работе">KZ</span>'
    : '';
  return `<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="${prefix}index.html" aria-label="${esc(site.brand.name)} — на главную">
      <img src="${prefix}assets/logo/logo-light-bg.svg" alt="${esc(site.brand.name)}" width="128" height="60">
    </a>
    <nav class="main-nav" aria-label="Основное меню">
      <a href="${navPrefix}#tours">Туры</a>
      <a href="${navPrefix}#how">Как это работает</a>
      <a href="${navPrefix}#about">О нас</a>
      <a href="${navPrefix}#contacts">Контакты</a>
    </nav>
    <div class="header-tools">
      <a class="phone-link" data-tel href="tel:${esc(site.contacts.phone)}">${esc(site.contacts.phoneDisplay)}</a>
      <div class="lang" role="group" aria-label="Язык сайта">
        <span aria-current="true">RU</span>${langSoon}
      </div>
      <a class="btn btn-primary header-cta" data-wa="${esc(waText)}" href="${esc(waHref(site, waText))}" target="_blank" rel="noopener">
        ${ICONS.whatsapp}
        ${esc(ctaLabel)}
      </a>
    </div>
  </div>
</header>`;
}

function renderFooter(site, tours, { isTour = false, waText }) {
  const prefix = isTour ? '../' : '';
  const tourPrefix = isTour ? '' : 'tours/';
  const navPrefix = isTour ? '../index.html' : '';
  const tourLinks = tours
    .map((t) => `          <li><a href="${tourPrefix}${esc(t.slug)}.html">${esc(t.name)}, ${esc(t.datesShort)}</a></li>`)
    .join('\n');
  const soonItem = site.home.footerSoonLabel
    ? `\n          <li><a href="${navPrefix}#soon">${esc(site.home.footerSoonLabel)}</a></li>`
    : '';

  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <img src="${prefix}assets/logo/logo-dark-bg.svg" alt="${esc(site.brand.name)}" width="152" height="72">
        <p>${esc(site.brand.tagline)}</p>
      </div>
      <div>
        <h3>Туры</h3>
        <ul>
${tourLinks}${soonItem}
        </ul>
      </div>
      <div>
        <h3>Связаться</h3>
        <ul>
          <li><a data-wa="${esc(waText)}" href="${esc(waHref(site, waText))}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li><a data-tel href="tel:${esc(site.contacts.phone)}">${esc(site.contacts.phoneDisplay)}</a></li>
          <li><a href="${esc(site.contacts.instagramUrl)}" target="_blank" rel="noopener">Instagram ${esc(site.contacts.instagramHandle)}</a></li>
          <li>${esc(site.contacts.address)} · ${esc(site.contacts.hoursCompact)}</li>
        </ul>
      </div>
    </div>
    <p class="footer-bottom">© ${site.brand.year} ${esc(site.brand.name)} · ${esc(site.brand.domain)}</p>
  </div>
</footer>`;
}

function renderContactBar(site, { waText }) {
  return `<nav class="contact-bar" aria-label="Связаться">
  <a class="btn btn-primary" data-wa="${esc(waText)}" href="${esc(waHref(site, waText))}" target="_blank" rel="noopener">
    ${ICONS.whatsapp}
    WhatsApp
  </a>
  <a class="btn btn-ghost" data-tel href="tel:${esc(site.contacts.phone)}">
    ${ICONS.phone}
    Позвонить
  </a>
</nav>`;
}

function renderPhotoGrid(photos, prefix, extraClass = '') {
  const cls = extraClass ? `photo-grid ${extraClass}` : 'photo-grid';
  const items = photos.map((p) => {
    const pos = p.objectPosition ? ` style="object-position: ${esc(p.objectPosition)}"` : '';
    return `        <figure><img src="${prefix}${esc(p.src)}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy"${pos}><figcaption><strong>${esc(p.city)}</strong> · ${esc(p.caption)}</figcaption></figure>`;
  }).join('\n');
  return `      <div class="${cls}">\n${items}\n      </div>`;
}

function renderReviews(reviews, { singleCardBg = false } = {}) {
  if (!reviews || !reviews.length) return '';
  const gridStyle = singleCardBg ? ' style="grid-template-columns:minmax(0, 760px)"' : '';
  const cardStyle = singleCardBg ? ' style="background:var(--ivory)"' : '';
  const items = reviews.map((r) => `        <figure class="review"${cardStyle}>
          <blockquote>${esc(r.text)}</blockquote>
          <figcaption>${esc(r.author)}${r.tour ? `, ${esc(r.tour)}` : ''}</figcaption>
        </figure>`).join('\n');
  return `\n      <div class="reviews"${gridStyle}>\n${items}\n      </div>`;
}

module.exports = {
  esc,
  fmt,
  waHref,
  ICONS,
  renderHeader,
  renderFooter,
  renderContactBar,
  renderPhotoGrid,
  renderReviews
};
