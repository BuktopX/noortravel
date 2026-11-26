(() => {
  const form = document.getElementById('anketaForm');
  if (!form) return;

  const STORAGE_KEY = 'noorBriefV1';
  const TOTAL_Q = 25;

  const progressCount = document.getElementById('progressCount');
  const progressFill = document.getElementById('progressFill');
  const saveStatus = document.getElementById('saveStatus');
  const summaryPreview = document.getElementById('summaryPreview');
  const sendFeedback = document.getElementById('sendFeedback');
  const readbackBanner = document.getElementById('readbackBanner');

  const params = new URLSearchParams(location.search);
  const waTarget = (params.get('to') || '').replace(/\D/g, '');

  function encodePayload(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodePayload(str) {
    const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function val(name) {
    const els = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
    if (!els.length) return '';
    const first = els[0];
    if (first.type === 'radio') {
      const checked = [...els].find((e) => e.checked);
      return checked ? checked.value : '';
    }
    if (first.type === 'checkbox') {
      return [...els].filter((e) => e.checked).map((e) => e.value);
    }
    return first.value.trim();
  }

  function collectState() {
    const data = {};
    const names = new Set([...form.elements].map((el) => el.name).filter(Boolean));
    names.forEach((name) => {
      const v = val(name);
      if (Array.isArray(v)) {
        data[name] = v;
      } else if (v !== '') {
        data[name] = v;
      }
    });
    return data;
  }

  function applyState(data) {
    if (!data || typeof data !== 'object') return;
    const names = new Set([...form.elements].map((el) => el.name).filter(Boolean));
    names.forEach((name) => {
      const els = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      if (!els.length) return;
      const first = els[0];
      if (first.type === 'radio') {
        els.forEach((el) => { el.checked = data[name] === el.value; });
      } else if (first.type === 'checkbox') {
        if (Object.prototype.hasOwnProperty.call(data, name) && Array.isArray(data[name])) {
          els.forEach((el) => { el.checked = data[name].includes(el.value); });
        }
      } else if (typeof data[name] === 'string') {
        first.value = data[name];
      }
    });
  }

  function syncChips() {
    form.querySelectorAll('.chip').forEach((chip) => {
      const inp = chip.querySelector('input[type="radio"], input[type="checkbox"]');
      if (inp) chip.classList.toggle('is-selected', inp.checked);
    });
    form.querySelectorAll('.mini-chips[data-fill-target]').forEach((group) => {
      const target = form.querySelector(`[name="${CSS.escape(group.dataset.fillTarget)}"]`);
      const cur = target ? target.value.trim() : '';
      group.querySelectorAll('.chip-btn').forEach((btn) => {
        btn.classList.toggle('is-selected', cur !== '' && btn.dataset.val === cur);
      });
    });
  }

  function syncConditionals() {
    form.querySelectorAll('[data-cond-for]').forEach((box) => {
      const targetName = box.dataset.condFor;
      const expected = box.dataset.condVal.split('|');
      const current = val(targetName);
      const show = Array.isArray(current)
        ? current.some((x) => expected.includes(x))
        : expected.includes(current);
      box.hidden = !show;
    });
  }

  function isQuestionAnswered(card) {
    const q = card.dataset.q;
    if (q === '3') {
      const hasInput = [...card.querySelectorAll('input[type="text"]')].some((i) => i.value.trim() !== '');
      const later = val('jp_hotels_later').length > 0 || val('jp_osaka_from_kyoto').length > 0;
      return hasInput || later;
    }
    if (q === '15') {
      const hasInput = [...card.querySelectorAll('input[type="text"]')].some((i) => i.value.trim() !== '');
      const later = val('au_hotels_later').length > 0;
      return hasInput || later;
    }
    const radios = [...card.querySelectorAll('input[type="radio"]')];
    if (q === '12') {
      return val('au_price') !== '' || val('au_price_tbd').length > 0;
    }
    const checks = [...card.querySelectorAll('input[type="checkbox"]')];
    const texts = [...card.querySelectorAll('input[type="text"], textarea')].filter((el) => !el.closest('[hidden]'));
    return radios.some((r) => r.checked) || checks.some((c) => c.checked) || texts.some((t) => t.value.trim() !== '');
  }

  function updateProgress() {
    const cards = [...form.querySelectorAll('.q-card[data-q]')];
    const done = cards.filter(isQuestionAnswered).length;
    progressCount.textContent = `Готово: ${done} / ${TOTAL_Q}`;
    progressFill.style.width = `${Math.round((done / TOTAL_Q) * 100)}%`;
  }

  function formatCity(label, daysName, nightsName, hotelName, extraLines = []) {
    const days = val(daysName);
    const nights = val(nightsName);
    const hotel = val(hotelName);
    const parts = [];
    if (days) parts.push(`дни ${days}`);
    if (nights) parts.push(`ночей: ${nights}`);
    if (hotel) parts.push(`отель: ${hotel}`);
    extraLines.forEach((line) => { if (line) parts.push(line); });
    return parts.length ? `  - ${label}: ${parts.join(' · ')}` : '';
  }

  function buildSummary() {
    const lines = ['Noor Travel — ответы по анкете', ''];
    const add = (title, value) => {
      if (!value || (Array.isArray(value) && !value.length)) return;
      lines.push(`${title}: ${Array.isArray(value) ? value.join(', ') : value}`);
    };

    // 1. Япония
    const jp = [];
    const pushJp = (label, value) => { if (value) jp.push(`${label}: ${value}`); };
    const jpDate = val('jp_dates');
    pushJp('1. Даты', jpDate === 'Уже планируем новые даты' && val('jp_dates_custom') ? `${jpDate} (${val('jp_dates_custom')})` : jpDate);
    pushJp('2. Свободных мест (из 6)', val('jp_spots'));

    const jpCities = [
      formatCity('Токио', 'jp_tokyo_days', 'jp_tokyo_nights', 'jp_tokyo_hotel'),
      formatCity('Киото', 'jp_kyoto_days', 'jp_kyoto_nights', 'jp_kyoto_hotel'),
      (val('jp_nara_days') || val('jp_nara_daytrip').length)
        ? `  - Нара: ${[val('jp_nara_days') ? `дни ${val('jp_nara_days')}` : '', ...val('jp_nara_daytrip')].filter(Boolean).join(' · ')}`
        : '',
      formatCity('Осака', 'jp_osaka_days', 'jp_osaka_nights', 'jp_osaka_hotel', val('jp_osaka_from_kyoto'))
    ].filter(Boolean);
    if (val('jp_hotels_later').length) jpCities.push('  - Отели: точные названия пришлю позже');
    if (jpCities.length) {
      jp.push('3. Маршрут и отели APA:\n' + jpCities.join('\n'));
    }

    const osakaPlaces = [...val('jp_osaka_places'), val('jp_osaka_other')].filter(Boolean);
    if (osakaPlaces.length) pushJp('4. Осака (доп. программа)', osakaPlaces.join(', '));

    const jpInc = [
      val('jp_inc_tickets') ? `билеты в храмы/музеи — ${val('jp_inc_tickets')}` : '',
      val('jp_inc_visa') ? `консульский сбор — ${val('jp_inc_visa')}` : '',
      val('jp_inc_baggage') ? `багаж — ${val('jp_inc_baggage')}` : ''
    ].filter(Boolean);
    if (jpInc.length) pushJp('5. Входит в стоимость', jpInc.join('; '));

    const jpPace = val('jp_pace');
    pushJp('6. Темп', jpPace === 'Другое' && val('jp_pace_custom') ? val('jp_pace_custom') : jpPace);
    if (val('jp_guide').length) pushJp('7. Гид и сопровождение', val('jp_guide').join(', '));

    const jpDead = val('jp_visa_deadline');
    pushJp('8. Срок подачи на визу', jpDead === 'Другое' && val('jp_visa_deadline_custom') ? val('jp_visa_deadline_custom') : jpDead);

    const jpDocs = [...val('jp_docs'), val('jp_docs_custom') ? `примечание: ${val('jp_docs_custom')}` : ''].filter(Boolean);
    if (jpDocs.length) pushJp('9. Документы на визу', jpDocs.join(', '));

    if (jp.length) {
      lines.push('=== 1. ЯПОНИЯ ===', ...jp, '');
    }

    // 2. Австралия и Новая Зеландия
    const au = [];
    const pushAu = (label, value) => { if (value) au.push(`${label}: ${value}`); };
    const auDep = val('au_departure');
    pushAu('10. Вылет', auDep === 'Другой' && val('au_departure_custom') ? val('au_departure_custom') : auDep);

    const auGroup = val('au_group');
    const auGroupTxt = auGroup === 'Другое' && val('au_group_custom') ? val('au_group_custom') : auGroup;
    const auSpotsTxt = val('au_spots_hide').length ? 'не показывать число' : (val('au_spots') ? `свободно ${val('au_spots')}` : '');
    if (auGroupTxt || auSpotsTxt) pushAu('11. Группа и места', [auGroupTxt, auSpotsTxt].filter(Boolean).join(', '));

    const auPriceTxt = val('au_price_tbd').length
      ? 'по запросу'
      : (val('au_price') ? `от ${val('au_price')} ${val('au_currency') || '₸'}` : '');
    pushAu('12. Стоимость', auPriceTxt);

    const auPay = val('au_payment');
    if (auPay === 'Другие условия') {
      const pParts = [
        val('au_pay_pre') ? `предоплата: ${val('au_pay_pre')}` : '',
        val('au_pay_rest') ? `остаток: ${val('au_pay_rest')}` : '',
        val('au_pay_refund') ? `возврат: ${val('au_pay_refund')}` : ''
      ].filter(Boolean);
      pushAu('13. Оплата и возврат', pParts.length ? pParts.join('; ') : 'другие условия');
    } else {
      pushAu('13. Оплата и возврат', auPay);
    }

    const auRoute = val('au_route');
    pushAu('14. Порядок городов', auRoute === 'Другой порядок' && val('au_route_custom') ? val('au_route_custom') : auRoute);

    const auCities = [
      formatCity('Сидней', 'au_syd_days', 'au_syd_nights', 'au_syd_hotel'),
      formatCity('Мельбурн', 'au_mel_days', 'au_mel_nights', 'au_mel_hotel'),
      formatCity('Веллингтон', 'au_wlg_days', 'au_wlg_nights', 'au_wlg_hotel')
    ].filter(Boolean);
    if (val('au_hotels_later').length) auCities.push('  - Отели: названия пришлю позже');
    if (auCities.length) au.push('15. Маршрут и отели:\n' + auCities.join('\n'));

    const aoParts = [
      val('au_ao_inc') ? `включены: ${val('au_ao_inc')}` : '',
      val('au_ao_tier') ? `места: ${val('au_ao_tier')}` : ''
    ].filter(Boolean);
    if (aoParts.length) pushAu('16. Билеты Australian Open', aoParts.join('; '));

    const auInc = [
      val('au_inc_breakfast') ? `завтраки — ${val('au_inc_breakfast')}` : '',
      val('au_inc_transfers') ? `трансферы — ${val('au_inc_transfers')}` : '',
      val('au_inc_visa') ? `визовые сборы — ${val('au_inc_visa')}` : '',
      val('au_guide').length ? `гид/сопровождение — ${val('au_guide').join(', ')}` : ''
    ].filter(Boolean);
    if (auInc.length) pushAu('17. Входит / отдельно', auInc.join('; '));

    const auFlight = val('au_flight');
    pushAu('18. Перелёт', auFlight === 'Другое' && val('au_flight_custom') ? val('au_flight_custom') : auFlight);
    pushAu('19. Темп программы', val('au_pace'));

    const auVisa = [
      val('au_visa_help') ? `подача: ${val('au_visa_help')}` : '',
      val('au_visa_deadline') ? `срок: ${val('au_visa_deadline')}` : '',
      val('au_docs').length ? `документы: ${val('au_docs').join(', ')}` : '',
      val('au_docs_custom') ? `доп. по документам: ${val('au_docs_custom')}` : ''
    ].filter(Boolean);
    if (auVisa.length) pushAu('20. Визы Австралии и НЗ', auVisa.join('; '));

    if (au.length) {
      lines.push('=== 2. АВСТРАЛИЯ И НЗ ===', ...au, '');
    }

    // 3. Отзывы
    const revMode = val('reviews_mode');
    if (revMode) {
      lines.push('=== 3. ОТЗЫВЫ ===');
      if (revMode === 'Напишу прямо здесь') {
        if (val('rev1_name') || val('rev1_text')) {
          lines.push(`Отзыв 1 (Япония) — ${val('rev1_name') || 'Без имени'}: ${val('rev1_text')}`);
        }
        if (val('rev2_name') || val('rev2_tour') || val('rev2_text')) {
          lines.push(`Отзыв 2 (${val('rev2_tour') || 'тур не указан'}) — ${val('rev2_name') || 'Без имени'}: ${val('rev2_text')}`);
        }
      } else {
        lines.push(`21. Отзывы: ${revMode}`);
      }
      lines.push('');
    }

    // 4. Общее
    const gen = [];
    const soon = [...val('soon_list'), val('soon_custom') ? `доп: ${val('soon_custom')}` : ''].filter(Boolean);
    if (soon.length) gen.push(`22. Раздел «Скоро»: ${soon.join(', ')}`);
    if (val('kz_lang')) gen.push(`23. Казахская версия (KZ): ${val('kz_lang')}`);

    const checks = [
      val('chk_contacts') ? `контакты: ${val('chk_contacts')}${val('chk_contacts_fix') ? ` (${val('chk_contacts_fix')})` : ''}` : '',
      val('chk_legal') ? `реквизиты: ${val('chk_legal')}${val('chk_legal_fix') ? ` (${val('chk_legal_fix')})` : ''}` : '',
      val('chk_domain') ? `домен noortravel.kz: ${val('chk_domain')}` : '',
      val('chk_photos') ? `фото из Японии: ${val('chk_photos')}${val('chk_photos_fix') ? ` (${val('chk_photos_fix')})` : ''}` : ''
    ].filter(Boolean);
    if (checks.length) gen.push(`24. Проверка сайта: ${checks.join('; ')}`);
    if (val('notes')) gen.push(`25. Комментарии: ${val('notes')}`);

    if (gen.length) {
      lines.push('=== 4. ОБЩЕЕ ===', ...gen);
    }

    return lines.join('\n').trim();
  }

  function buildAnswerLink() {
    const base = location.href.split('#')[0];
    return `${base}#r=${encodePayload(collectState())}`;
  }

  let feedbackTimer = null;
  function flashFeedback(msg) {
    sendFeedback.textContent = msg;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { sendFeedback.textContent = ''; }, 5000);
  }

  async function copyText(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(str);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  function refreshUI(persist = false) {
    syncChips();
    syncConditionals();
    updateProgress();
    summaryPreview.textContent = buildSummary();
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
        saveStatus.textContent = 'Сохранено';
      } catch {}
    }
  }

  // Nights quick-fill buttons
  form.querySelectorAll('.mini-chips[data-fill-target] .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetName = btn.closest('.mini-chips').dataset.fillTarget;
      const input = form.querySelector(`[name="${CSS.escape(targetName)}"]`);
      if (!input) return;
      input.value = input.value.trim() === btn.dataset.val ? '' : btn.dataset.val;
      refreshUI(true);
    });
  });

  form.addEventListener('input', () => refreshUI(true));
  form.addEventListener('change', () => refreshUI(true));

  // Submit actions
  document.getElementById('btnWa').addEventListener('click', async () => {
    const text = buildSummary();
    const link = buildAnswerLink();
    const waBase = waTarget ? `https://wa.me/${waTarget}` : 'https://wa.me/';
    if (encodeURIComponent(text).length <= 1800) {
      window.open(`${waBase}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      flashFeedback('Открываем WhatsApp с готовыми ответами.');
    } else {
      try { await copyText(text); } catch {}
      const shortMsg = `Заполнил(а) анкету Noor Travel. Ссылка с ответами: ${link}\n(Полный текст также скопирован в буфер обмена)`;
      window.open(`${waBase}?text=${encodeURIComponent(shortMsg)}`, '_blank', 'noopener');
      flashFeedback('Текст длинный — скопировали его в буфер и открыли WhatsApp со ссылкой.');
    }
  });

  document.getElementById('btnTg').addEventListener('click', async () => {
    const link = buildAnswerLink();
    try { await copyText(buildSummary()); } catch {}
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Ответы по анкете Noor Travel')}`;
    window.open(tgUrl, '_blank', 'noopener');
    flashFeedback('Открываем Telegram со ссылкой на ответы (текст также скопирован).');
  });

  document.getElementById('btnCopyText').addEventListener('click', async () => {
    await copyText(buildSummary());
    flashFeedback('Скопировано — просто вставьте в чат.');
  });

  document.getElementById('btnCopyLink').addEventListener('click', async () => {
    await copyText(buildAnswerLink());
    flashFeedback('Ссылка с ответами скопирована — отправьте её в любой чат.');
  });

  document.getElementById('btnDownload').addEventListener('click', () => {
    const blob = new Blob([buildSummary() + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noor-travel-anketa.txt';
    a.click();
    URL.revokeObjectURL(url);
    flashFeedback('Файл noor-travel-anketa.txt скачан.');
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('Очистить все ответы в анкете?')) return;
    form.reset();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (location.hash.startsWith('#r=')) {
      history.replaceState(null, '', location.pathname + location.search);
      readbackBanner.hidden = true;
    }
    refreshUI(false);
    saveStatus.textContent = 'Ответы очищены';
  });

  // Read-back banner buttons
  document.getElementById('btnBannerCopyText').addEventListener('click', async () => {
    await copyText(buildSummary());
    flashFeedback('Текст ответов скопирован.');
  });
  document.getElementById('btnBannerCopyJson').addEventListener('click', async () => {
    await copyText(JSON.stringify(collectState(), null, 2));
    flashFeedback('JSON с ответами скопирован.');
  });
  document.getElementById('btnBannerEdit').addEventListener('click', () => {
    readbackBanner.hidden = true;
  });

  // Initial hydration: #r= hash takes priority over localStorage draft
  let hydratedFromHash = false;
  if (location.hash.startsWith('#r=')) {
    try {
      const decoded = decodePayload(location.hash.slice(3));
      applyState(decoded);
      readbackBanner.hidden = false;
      hydratedFromHash = true;
      saveStatus.textContent = 'Загружено из ссылки';
    } catch {}
  }
  if (!hydratedFromHash) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) applyState(JSON.parse(saved));
    } catch {}
  }

  refreshUI(false);
})();
