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

function renderTrainSvg() {
  return `
      <!-- Shinkansen seen from above: three cars, each placed on the track behind the one in front.
           Cars point right; data-offset = distance behind the lead car. -->
      <g id="train">
        <g class="car is-hidden" data-offset="0">
          <path class="car-body" d="M-26-7H0C12-7 22-4 26 0 22 4 12 7 0 7H-26Z"/>
          <path class="car-stripe" d="M-26-5H5M-26 5H5"/>
          <path class="car-glass" d="M5-3.6C11-3.6 15-2 17 0 15 2 11 3.6 5 3.6Z"/>
        </g>
        <g class="car is-hidden" data-offset="47">
          <rect class="car-body" x="-18" y="-7" width="36" height="14" rx="2.5"/>
          <path class="car-stripe" d="M-18-5H18M-18 5H18"/>
          <path class="car-panto" d="M-5-3.4 5 3.4M-5 3.4 5-3.4M-7 0H7"/>
        </g>
        <g class="car is-hidden" data-offset="94" data-flip="1">
          <path class="car-body" d="M-26-7H0C12-7 22-4 26 0 22 4 12 7 0 7H-26Z"/>
          <path class="car-stripe" d="M-26-5H5M-26 5H5"/>
          <path class="car-glass" d="M5-3.6C11-3.6 15-2 17 0 15 2 11 3.6 5 3.6Z"/>
        </g>
      </g>`;
}

function renderRouteStop(site, tour, stop) {
  const wa = waHref(site, tour.waText);
  if (stop.type === 'scenery') {
    return `      <li class="scenery ${esc(stop.side)}">
        <figure class="stop-art" data-kanji="${esc(stop.code)}">
          <img src="../${esc(stop.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-art'); this.remove()">
        </figure>
        <div class="stop-text">
          <p class="eyebrow">${esc(stop.eyebrow)}</p>
          <p>${esc(stop.text)}</p>
        </div>
      </li>`;
  }

  if (stop.type === 'landing') {
    return `      <li class="stop ${esc(stop.side)} landing">
        <div class="stop-dot"></div>
        <div class="landing-art">
          <figure class="stop-art" data-kanji="${esc(stop.code)}">
            <img src="../${esc(stop.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-art'); this.remove()">
          </figure>
          <a class="btn btn-primary landing-cta" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">
            ${ICONS.whatsapp}
            ${esc(stop.ctaText || 'Получить программу в WhatsApp')}
          </a>
        </div>
        <div class="stop-text">
          <p class="eyebrow">${esc(stop.eyebrow)}</p>
          <h2>${esc(stop.title)}</h2>
          <p>${esc(stop.text)}</p>
        </div>
      </li>`;
  }

  const subtitle = stop.subtitleCode ? `<small aria-hidden="true">${esc(stop.subtitleCode)}</small>` : '';
  const metaLine = stop.meta ? `\n          <p class="meta-line">${fmt(stop.meta)}</p>` : '';
  const tags = stop.tags && stop.tags.length
    ? `\n          <ul class="tags">${stop.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : '';
  const vAfter = stop.vehicleAfter ? ` data-vehicle-after="${esc(stop.vehicleAfter)}"` : '';

  return `      <li class="stop ${esc(stop.side)}"${vAfter}>
        <div class="stop-dot"></div>
        <figure class="stop-art" data-kanji="${esc(stop.code)}">
          <img src="../${esc(stop.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-art'); this.remove()">
        </figure>
        <div class="stop-text">
          <p class="eyebrow">${esc(stop.eyebrow)}</p>
          <h2>${esc(stop.title)}${subtitle}</h2>${metaLine}
          <p>${esc(stop.text)}</p>${tags}
        </div>
      </li>`;
}

function renderHotels(tour) {
  if (!tour.hotels || !tour.hotels.items || !tour.hotels.items.length) return '';
  const cards = tour.hotels.items.map((h) => {
    const nights = h.nights ? `<p class="small-note">${fmt(h.nights)}</p>` : '';
    return `        <div class="hotel"><p class="hotel-city">${esc(h.city)}</p><p>${esc(h.name)}</p>${nights}</div>`;
  }).join('\n');

  return `  <!-- Hotels -->
  <section class="section paper" aria-labelledby="hotels-title">
    <div class="wrap">
      <div class="split-head">
        <div class="section-head" style="margin-bottom:0">
          <p class="eyebrow">Отели</p>
          <h2 id="hotels-title">Где живём</h2>
        </div>
        <p class="lead">${esc(tour.hotels.lead)}</p>
      </div>
      <div class="hotels">
${cards}
      </div>
    </div>
  </section>\n\n`;
}

function renderDocuments(tour) {
  if (!tour.documents) return '';
  const stepsHtml = tour.documents.steps && tour.documents.steps.length
    ? `\n      <ol class="timeline">\n${tour.documents.steps.map((s) => `        <li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('\n')}\n      </ol>`
    : '';
  const docsList = tour.documents.list
    ? `\n      <p class="docs-list">Какие документы нужны: ${esc(tour.documents.list)}</p>`
    : '';

  return `  <!-- Documents -->
  <section class="section" aria-labelledby="docs-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Документы</p>
        <h2 id="docs-title">${esc(tour.documents.title)}</h2>
        <p class="lead">${esc(tour.documents.lead)}</p>
      </div>${stepsHtml}${docsList}
    </div>
  </section>\n\n`;
}

function renderTour(site, tours, tour) {
  const { brand, contacts, team } = site;
  const wa = waHref(site, tour.waText);
  const baseUrl = brand.baseUrl.replace(/\/$/, '');
  const tourUrl = `${baseUrl}/tours/${tour.slug}.html`;

  const stopsHtml = tour.route.stops.map((s) => renderRouteStop(site, tour, s)).join('\n\n');
  const trainSvg = tour.route.hasTrain ? renderTrainSvg() : '';

  const yesList = (tour.included.yes || [])
    .map((item) => `            <li>${ICONS.check}<span>${fmt(item)}</span></li>`)
    .join('\n');
  const noList = (tour.included.no || [])
    .map((item) => `            <li>${ICONS.minus}<span>${fmt(item)}</span></li>`)
    .join('\n');

  const fitYes = (tour.fit.yes || []).map((item) => `            <li>${fmt(item)}</li>`).join('\n');
  const fitConsider = (tour.fit.consider || []).map((item) => `            <li>${fmt(item)}</li>`).join('\n');

  const spotsHtml = tour.spotsLeft !== null && tour.spotsLeft !== undefined && tour.spotsLeft !== ''
    ? `\n        <div><span>Свободных мест</span><strong>${fmt(tour.spotsLeft)}</strong></div>`
    : '';
  const termsHtml = tour.paymentTerms
    ? `\n      <p class="departure-terms">${fmt(tour.paymentTerms)}</p>`
    : '';

  const teamPhotos = tour.team && tour.team.photos && tour.team.photos.length
    ? `\n${renderPhotoGrid(tour.team.photos, '../', 'team-photos')}${tour.team.photosNote ? `\n      <p class="small-note" style="margin-top:14px">${esc(tour.team.photosNote)}</p>` : ''}`
    : '';
  const teamReviews = tour.team && tour.team.reviews && tour.team.reviews.length
    ? renderReviews(tour.team.reviews, { singleCardBg: true })
    : '';

  const faqHtml = (tour.faq || []).map((item, idx) => `        <details${idx === 0 ? ' open' : ''}>
          <summary>${esc(item.q)}</summary>
          <div><p>${fmt(item.a)}</p></div>
        </details>`).join('\n');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tour.seo.title)}</title>
<meta name="description" content="${esc(tour.seo.description)}">
<link rel="canonical" href="${esc(tourUrl)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:url" content="${esc(tourUrl)}">
<meta property="og:title" content="${esc(tour.seo.ogTitle)}">
<meta property="og:description" content="${esc(tour.seo.ogDescription)}">
<meta property="og:image" content="${esc(baseUrl)}/${esc(tour.seo.ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${esc(brand.themeColor)}">
<link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="../assets/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="../assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Brygada+1918:ital,wght@0,500;0,700;1,500&family=Golos+Text:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../assets/styles.css">
<link rel="stylesheet" href="../assets/tour.css">
</head>
<body>
<a class="skip" href="#main">Перейти к содержанию</a>

${renderHeader(site, { isTour: true, waText: tour.waText, ctaLabel: 'WhatsApp' })}

<main id="main">

  <div class="wrap">
    <p class="crumbs"><a href="../index.html">Главная</a> / <a href="../index.html#tours">Туры</a> / ${esc(tour.name)}</p>
  </div>

  <!-- Hero -->
  <section class="tour-hero">
    <div class="wrap" style="display:grid;gap:40px">
      <div class="hero-grid">
        <div class="hero-text">
          <p class="eyebrow">${esc(tour.hero.eyebrow)}</p>
          <h1>${esc(tour.hero.title)}</h1>
          <p class="lead">${esc(tour.hero.lead)}</p>
          <div class="actions">
            <a class="btn btn-primary" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">
              ${ICONS.whatsapp}
              Получить программу
            </a>
            <a class="btn btn-ghost" href="#route">Смотреть маршрут</a>
          </div>
          <p class="hero-note">${esc(tour.hero.note)}</p>
        </div>
        <div class="globe" data-globe="${esc(tour.slug)}" data-label="${esc(tour.hero.globeAriaLabel)}"></div>
      </div>

      <dl class="keyfacts">
        <div><dt>Даты</dt><dd>${fmt(tour.datesFull)}</dd></div>
        <div><dt>Вылет</dt><dd>${esc(tour.departureLabel)}</dd></div>
        <div><dt>Группа</dt><dd>${fmt(tour.groupLabel)}</dd></div>
        <div><dt>Стоимость</dt><dd>${fmt(tour.priceLabel)}</dd></div>
        <div><dt>Гид</dt><dd>${esc(tour.guideShort)}</dd></div>
      </dl>
    </div>
  </section>

  <!-- Scroll route -->
  <div class="wrap route-head">
    <p class="eyebrow">Маршрут</p>
    <h2>${esc(tour.route.title)}</h2>
    <p class="lead route-lead">${esc(tour.route.lead)}</p>
    <p class="scroll-hint" aria-hidden="true"><span></span>Листайте</p>
  </div>

  <section class="route wrap" id="route" aria-label="Маршрут тура">
    <svg class="route-svg" aria-hidden="true">
      <path class="route-base" id="routeBase"/>
      <path class="route-done" id="routeDone"/>
      <g class="rails">
        <path id="railTies"/>
        <path id="railOuter"/>
        <path id="railOuterDone"/>
        <path id="railInner"/>
      </g>
    </svg>
    <svg class="vehicle-svg" aria-hidden="true">
      <g id="vehicleWrap">
        <g class="vehicle" id="plane">
          <circle r="30" fill="#F6F1E8" opacity=".9"/>
          <path fill="#13203A" d="M22 0C22-2 20-3 17-3H4L-6-16H-11L-5-3H-14L-18-8H-21L-19 0-21 8H-18L-14 3H-5L-11 16H-6L4 3H17C20 3 22 2 22 0Z"/>
        </g>
      </g>${trainSvg}
    </svg>

    <ol class="stops">
${stopsHtml}
    </ol>
  </section>

${renderHotels(tour)}  <!-- What's included -->
  <section class="section" aria-labelledby="included-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Что входит</p>
        <h2 id="included-title">${esc(tour.included.title)}</h2>
      </div>
      <div class="included">
        <div>
          <h3>Входит в тур</h3>
          <ul class="checklist yes">
${yesList}
          </ul>
        </div>
        <div>
          <h3>Оплачивается отдельно</h3>
          <ul class="checklist no">
${noList}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Is this tour for you? -->
  <section class="section" aria-labelledby="fit-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Честно о туре</p>
        <h2 id="fit-title">Подходит ли вам этот тур?</h2>
      </div>
      <div class="fit">
        <div>
          <h3>Вам понравится, если</h3>
          <ul class="fit-list">
${fitYes}
          </ul>
        </div>
        <div>
          <h3>Стоит учесть</h3>
          <ul class="fit-list">
${fitConsider}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Next departure -->
  <section class="section on-navy" aria-labelledby="dates-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Даты и места</p>
        <h2 id="dates-title">Ближайший выезд</h2>
      </div>
      <div class="departure">
        <div><span>Даты</span><strong class="departure-date">${fmt(tour.datesFull)}</strong></div>
        <div><span>Вылет</span><strong>${esc(tour.departureLabel)}</strong></div>
        <div><span>Стоимость</span><strong>${fmt(tour.priceLabel)}</strong></div>${spotsHtml}
        <a class="btn btn-primary" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">Получить программу</a>
      </div>${termsHtml}
    </div>
  </section>

${renderDocuments(tour)}  <!-- Who organises -->
  <section class="section paper" aria-labelledby="team-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Кто организует</p>
        <h2 id="team-title">Вас ведут живые люди</h2>
      </div>
      <div class="team">
        <div class="person team-card">
          <div class="avatar"><img src="../${esc(team.founder.photo)}" alt="${esc(team.founder.name)}" width="512" height="512" loading="lazy"></div>
          <div><p class="person-name">${esc(team.founder.name)}</p><p class="person-role">${esc(team.founder.tourRole)}</p></div>
        </div>
        <div class="person team-card">
          <div><p class="person-name">${esc(team.managersCombined.name)}</p><p class="person-role">${esc(team.managersCombined.role)}</p><a class="text-link" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">Написать в WhatsApp →</a></div>
        </div>
      </div>${teamPhotos}${teamReviews}
    </div>
  </section>

  <!-- FAQ -->
  <section class="section tight" aria-labelledby="faq-title">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Вопросы</p>
        <h2 id="faq-title">Частые вопросы</h2>
      </div>
      <div class="faq">
${faqHtml}
      </div>
    </div>
  </section>

  <!-- Final call to action -->
  <section class="section tight on-navy" id="contacts" aria-labelledby="contacts-title">
    <div class="wrap cta-box">
      <div class="section-head" style="margin-bottom:0">
        <p class="eyebrow">${esc(tour.finalCta.eyebrow)}</p>
        <h2 id="contacts-title">${esc(tour.finalCta.title)}</h2>
        <p class="lead">${esc(tour.finalCta.lead)}</p>
      </div>
      <div class="actions">
        <a class="btn btn-primary" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">
          ${ICONS.whatsapp}
          Получить программу
        </a>
        <a class="btn btn-ghost" data-tel href="tel:${esc(contacts.phone)}">
          ${ICONS.phone}
          Позвонить
        </a>
      </div>
    </div>
  </section>

</main>

${renderFooter(site, tours, { isTour: true, waText: tour.waText })}

<aside class="tour-pill" aria-label="Тур: ${esc(tour.name)}">
  <span class="tour-pill-name">${esc(tour.pill.name)}</span>
  <span class="tour-pill-meta">${fmt(tour.pill.meta)}</span>
  <a class="btn btn-primary" data-wa="${esc(tour.waText)}" href="${esc(wa)}" target="_blank" rel="noopener">Получить программу</a>
</aside>

${renderContactBar(site, { waText: tour.waText })}

<script src="../assets/site.js"></script>
<script src="../assets/route.js"></script>
<script src="../assets/globe-scenes.js"></script>
<script src="../assets/globe.js"></script>
</body>
</html>
`;
}

module.exports = { renderTour };
