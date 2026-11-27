const {
  esc,
  fmt,
  waHref,
  ICONS,
  renderHeader,
  renderFooter,
  renderContactBar,
  renderPhotoGrid,
  renderReviews
} = require('./partials');

function renderTourCard(site, tour) {
  const srcset = tour.card.image960
    ? ` srcset="${esc(tour.card.image960)} 960w, ${esc(tour.card.image)} ${tour.card.width}w" sizes="(max-width: 899px) calc(100vw - 48px), 50vw"`
    : '';
  const bullets = (tour.card.bullets || [])
    .map((b) => `              <li>${fmt(b)}</li>`)
    .join('\n');
  const wa = waHref(site, tour.waText);

  return `        <article class="journey">
          <div class="journey-art">
            <img loading="lazy" src="${esc(tour.card.image)}"${srcset} alt="${esc(tour.card.alt)}" width="${tour.card.width}" height="${tour.card.height}">
          </div>
          <div class="journey-body">
            <span class="date-chip">${fmt(tour.datesShort)}</span>
            <h3>${esc(tour.name)}</h3>
            <p class="card-route">${esc(tour.routeLine)}</p>
            <ul class="meta">
${bullets}
            </ul>
            <div class="actions">
              <a class="btn btn-primary" href="tours/${esc(tour.slug)}.html">Подробнее о туре</a>
              <a class="btn btn-ghost" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>
        </article>`;
}

function renderSoonBlock(site) {
  const soon = site.home.soonTours || [];
  if (!soon.length) return '';
  const items = soon
    .map((s) => `            <li><span>${esc(s.title)}</span><a data-wa="${esc(s.waText)}" href="${esc(waHref(site, s.waText))}" target="_blank" rel="noopener">Подробнее →</a></li>`)
    .join('\n');

  return `        <div class="soon-block" id="soon" aria-labelledby="soon-title">
          <div class="soon-head">
            <div>
              <p class="eyebrow">Скоро</p>
              <h3 id="soon-title">Готовим новые туры</h3>
            </div>
            <p>Даты и программы появятся здесь. Напишите нам — сообщим первыми.</p>
          </div>
          <ul class="soon-list">
${items}
          </ul>
        </div>`;
}

function renderHome(site, tours) {
  const { home, contacts, legal, team, brand } = site;
  const waText = home.defaultWaText;
  const waUrl = waHref(site, waText);
  const baseUrl = brand.baseUrl.replace(/\/$/, '');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: brand.name,
    url: `${baseUrl}/`,
    telephone: contacts.phone,
    image: `${baseUrl}/${home.ogImage}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contacts.streetAddress,
      addressLocality: contacts.city,
      addressCountry: contacts.country
    },
    openingHours: contacts.openingHoursSchema,
    sameAs: [contacts.instagramUrl]
  });

  const tourCards = tours.map((t) => renderTourCard(site, t)).join('\n');
  const soonBlock = renderSoonBlock(site);

  const whyItems = home.why.items.map((item) => {
    const note = item.note ? `\n            <p class="small-note">${esc(item.note)}</p>` : '';
    return `        <li>
          <span class="why-icon">${ICONS[item.icon] || ICONS.map}</span>
          <div>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>${note}
          </div>
        </li>`;
  }).join('\n');

  const howSteps = home.how.steps.map((step) => {
    if (step.icon && ICONS[step.icon]) {
      return `        <li class="has-icon"><span class="timeline-icon">${ICONS[step.icon]}</span><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></li>`;
    }
    return `        <li><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></li>`;
  }).join('\n');

  const galleryHtml = renderPhotoGrid(home.gallery.photos, '');
  const reviewsHtml = renderReviews(home.gallery.reviews);

  const managerCards = team.managers.map((m) => `        <div class="manager">
          <p class="manager-name">${esc(m.name)}</p>
          <p class="small-note">${esc(m.role)}</p>
          <a class="text-link" data-wa="${esc(waText)}" href="${esc(waUrl)}" target="_blank" rel="noopener">Написать в WhatsApp →</a>
        </div>`).join('\n');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(home.title)}</title>
<meta name="description" content="${esc(home.description)}">
<link rel="canonical" href="${esc(baseUrl)}/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:url" content="${esc(baseUrl)}/">
<meta property="og:title" content="${esc(home.title)}">
<meta property="og:description" content="${esc(home.ogDescription)}">
<meta property="og:image" content="${esc(baseUrl)}/${esc(home.ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${esc(brand.themeColor)}">
<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Brygada+1918:ital,wght@0,500;0,700;1,500&family=Golos+Text:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/styles.css">
<script type="application/ld+json">
${jsonLd}
</script>
</head>
<body>
<a class="skip" href="#main">Перейти к содержанию</a>

<div class="intro" id="intro">
  <img src="assets/logo/logo-animated-light-bg.svg" alt="" width="520" height="246">
  <button class="intro-skip" type="button">Пропустить</button>
</div>
<script>
  // The logo intro plays at most once a day (in-app browsers often lose sessionStorage between taps).
  // A tap, any key or the button skips it.
  (() => {
    const intro = document.getElementById('intro');
    const DAY = 864e5;
    try {
      if (Date.now() - Number(localStorage.getItem('noorIntroSeen') || 0) < DAY) { intro.remove(); return; }
      localStorage.setItem('noorIntroSeen', String(Date.now()));
    } catch {}
    const skip = () => intro.classList.add('is-skipped');
    intro.addEventListener('click', skip);
    addEventListener('keydown', skip, { once: true });
    intro.addEventListener('animationend', (e) => {
      if (e.target !== intro) return;
      intro.remove();
      document.getElementById('main')?.focus({ preventScroll: true });
    });
  })();
</script>

${renderHeader(site, { isTour: false, waText, ctaLabel: 'WhatsApp' })}

<main id="main" tabindex="-1">

  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="eyebrow">${esc(home.hero.eyebrow)}</p>
        <h1>${esc(home.hero.title)}</h1>
        <p class="lead">${esc(home.hero.lead)}</p>
        <div class="actions">
          <a class="btn btn-primary" data-wa="${esc(waText)}" href="${esc(waUrl)}" target="_blank" rel="noopener">
            ${ICONS.whatsapp}
            Написать в WhatsApp
          </a>
          <a class="btn btn-ghost" href="#tours">Смотреть туры</a>
        </div>
        <p class="hero-note">${esc(home.hero.note)}</p>
      </div>
      <div class="globe" data-globe="home" data-label="${esc(home.globeLabel)}"></div>
    </div>
  </section>

  <section class="section tight" id="tours" aria-labelledby="tours-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Ближайшие выезды</p>
        <h2 id="tours-title">Куда едем</h2>
      </div>
${tourCards}
${soonBlock}
    </div>
  </section>

  <section class="section" aria-labelledby="why-title">
    <div class="wrap why">
      <div class="why-intro">
        <div class="section-head">
          <p class="eyebrow">${esc(home.why.eyebrow)}</p>
          <h2 id="why-title">${esc(home.why.title)}</h2>
        </div>
        <img class="why-art" src="${esc(home.why.art)}" alt="${esc(home.why.artAlt)}" width="800" height="800" loading="lazy">
      </div>
      <ul class="why-list">
${whyItems}
      </ul>
    </div>
  </section>

  <section class="section paper" id="how" aria-labelledby="how-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">${esc(home.how.eyebrow)}</p>
        <h2 id="how-title">${esc(home.how.title)}</h2>
      </div>
      <ol class="timeline">
${howSteps}
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="gallery-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">${esc(home.gallery.eyebrow)}</p>
        <h2 id="gallery-title">${esc(home.gallery.title)}</h2>
      </div>
${galleryHtml}${reviewsHtml}
    </div>
  </section>

  <section class="section on-navy" id="about" aria-labelledby="about-title">
    <div class="wrap trust-grid">
      <div class="section-head" style="margin-bottom:0">
        <p class="eyebrow">${esc(home.about.eyebrow)}</p>
        <h2 id="about-title">${esc(home.about.title)}</h2>
        <p class="about-lead">${esc(home.about.lead)}</p>
        <div class="person">
          <div class="avatar"><img src="${esc(team.founder.photo)}" alt="${esc(team.founder.name)}" width="512" height="512" loading="lazy"></div>
          <div><p class="person-name">${esc(team.founder.name)}</p><p class="person-role">${esc(team.founder.role)}</p></div>
        </div>
      </div>
      <dl class="facts">
        <div><dt>Компания</dt><dd>${esc(legal.company)}</dd></div>
        <div><dt>ИИН</dt><dd>${esc(legal.iin)}</dd></div>
        <div><dt>Турагентская деятельность</dt><dd>${esc(legal.notice)}</dd></div>
        <div><dt>Офис</dt><dd>${esc(contacts.address)}</dd></div>
        <div><dt>Часы работы</dt><dd>${esc(contacts.hours)}</dd></div>
      </dl>
    </div>
  </section>

  <section class="section" id="contacts" aria-labelledby="contacts-title">
    <div class="wrap cta-box">
      <div class="section-head" style="margin-bottom:0">
        <p class="eyebrow">${esc(home.contacts.eyebrow)}</p>
        <h2 id="contacts-title">${esc(home.contacts.title)}</h2>
        <p class="lead">${esc(home.contacts.lead)}</p>
        <div class="actions" style="margin-top:8px">
          <a class="btn btn-primary" data-wa="${esc(waText)}" href="${esc(waUrl)}" target="_blank" rel="noopener">
            ${ICONS.whatsapp}
            Написать в WhatsApp
          </a>
          <a class="btn btn-ghost" data-tel href="tel:${esc(contacts.phone)}">
            ${ICONS.phone}
            Позвонить
          </a>
        </div>
      </div>
      <div class="managers">
${managerCards}
      </div>
    </div>
  </section>

</main>

${renderFooter(site, tours, { isTour: false, waText })}

${renderContactBar(site, { waText })}

<script src="assets/site.js"></script>
<script src="assets/globe-scenes.js"></script>
<script src="assets/globe.js"></script>
</body>
</html>
`;
}

module.exports = { renderHome };
