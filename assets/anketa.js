(() => {
  const form = document.getElementById('anketaForm');
  if (!form) return;

  const WEB3FORMS_KEY = '52f56e18-a755-4c09-9d03-ac11cfaa201c';
  const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
  const STORAGE_KEY = 'noorBriefV1';
  const TOTAL_Q = 25;

  const progressCount = document.getElementById('progressCount');
  const progressFill = document.getElementById('progressFill');
  const saveStatus = document.getElementById('saveStatus');
  const sendReady = document.getElementById('sendReady');
  const sendSuccess = document.getElementById('sendSuccess');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnEditAgain = document.getElementById('btnEditAgain');
  const sendFeedback = document.getElementById('sendFeedback');
  const sendSection = document.getElementById('sec-send');

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
    const names = new Set([...form.elements].map((el) => el.name).filter((n) => n && n !== 'botcheck'));
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
    const names = new Set([...form.elements].map((el) => el.name).filter((n) => n && n !== 'botcheck'));
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
    if (q === '12') {
      return val('au_price') !== '' || val('au_price_tbd').length > 0;
    }
    const radios = [...card.querySelectorAll('input[type="radio"]')];
    const checks = [...card.querySelectorAll('input[type="checkbox"]')];
    const texts = [...card.querySelectorAll('input[type="text"], textarea')].filter((el) => !el.closest('[hidden]'));
    return radios.some((r) => r.checked) || checks.some((c) => c.checked) || texts.some((t) => t.value.trim() !== '');
  }

  function countDone() {
    const cards = [...form.querySelectorAll('.q-card[data-q]')];
    return cards.filter(isQuestionAnswered).length;
  }

  function updateProgress() {
    const done = countDone();
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

  function buildSections() {
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

    // 3. Отзывы
    const reviews = [];
    const revMode = val('reviews_mode');
    if (revMode) {
      if (revMode === 'Напишу прямо здесь') {
        if (val('rev1_name') || val('rev1_text')) {
          reviews.push(`Отзыв 1 (Япония) — ${val('rev1_name') || 'Без имени'}: ${val('rev1_text')}`);
        }
        if (val('rev2_name') || val('rev2_tour') || val('rev2_text')) {
          reviews.push(`Отзыв 2 (${val('rev2_tour') || 'тур не указан'}) — ${val('rev2_name') || 'Без имени'}: ${val('rev2_text')}`);
        }
        if (!reviews.length) reviews.push('21. Отзывы: выбран ввод в анкете (текст не заполнен)');
      } else {
        reviews.push(`21. Отзывы: ${revMode}`);
      }
    }

    // 4. Общее
    const general = [];
    const soon = [...val('soon_list'), val('soon_custom') ? `доп: ${val('soon_custom')}` : ''].filter(Boolean);
    if (soon.length) general.push(`22. Раздел «Скоро»: ${soon.join(', ')}`);
    if (val('kz_lang')) general.push(`23. Казахская версия (KZ): ${val('kz_lang')}`);

    const checks = [
      val('chk_contacts') ? `контакты: ${val('chk_contacts')}${val('chk_contacts_fix') ? ` (${val('chk_contacts_fix')})` : ''}` : '',
      val('chk_legal') ? `реквизиты: ${val('chk_legal')}${val('chk_legal_fix') ? ` (${val('chk_legal_fix')})` : ''}` : '',
      val('chk_domain') ? `домен noortravel.kz: ${val('chk_domain')}` : '',
      val('chk_photos') ? `фото из Японии: ${val('chk_photos')}${val('chk_photos_fix') ? ` (${val('chk_photos_fix')})` : ''}` : ''
    ].filter(Boolean);
    if (checks.length) general.push(`24. Проверка сайта: ${checks.join('; ')}`);
    if (val('notes')) general.push(`25. Комментарии: ${val('notes')}`);

    return {
      doneCount: countDone(),
      jp: jp.join('\n'),
      au: au.join('\n'),
      reviews: reviews.join('\n'),
      general: general.join('\n')
    };
  }

  function refreshUI(persist = false) {
    syncChips();
    syncConditionals();
    updateProgress();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.querySelector('[name="botcheck"]')?.checked) return;

    const sections = buildSections();
    if (!sections.jp && !sections.au && !sections.reviews && !sections.general) {
      sendFeedback.classList.add('is-error');
      sendFeedback.textContent = 'Похоже, пока не выбран ни один ответ — отметьте нужные пункты и нажмите «Отправить ответы».';
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Отправляем...';
    sendFeedback.classList.remove('is-error');
    sendFeedback.textContent = '';

    const payload = {
      access_key: WEB3FORMS_KEY,
      subject: 'Noor Travel — ответы по анкете для сайта',
      from_name: 'Анкета Noor Travel',
      botcheck: false,
      'Заполнено вопросов': `${sections.doneCount} из ${TOTAL_Q}`
    };
    if (sections.jp) payload['1. Тур в Японию'] = sections.jp;
    if (sections.au) payload['2. Австралия и Новая Зеландия'] = sections.au;
    if (sections.reviews) payload['3. Отзывы туристов'] = sections.reviews;
    if (sections.general) payload['4. Общие детали сайта'] = sections.general;

    try {
      const res = await fetch(WEB3FORMS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        sendReady.hidden = true;
        sendSuccess.hidden = false;
        saveStatus.textContent = 'Отправлено';
        sendSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        throw new Error(result.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      sendFeedback.classList.add('is-error');
      sendFeedback.textContent = 'Не удалось отправить ответы — проверьте интернет и попробуйте ещё раз.';
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Отправить ответы';
    }
  });

  btnEditAgain.addEventListener('click', () => {
    sendSuccess.hidden = true;
    sendReady.hidden = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Отправить ответы';
    sendFeedback.classList.remove('is-error');
    sendFeedback.textContent = '';
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('Очистить все ответы в анкете?')) return;
    form.reset();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    sendSuccess.hidden = true;
    sendReady.hidden = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Отправить ответы';
    sendFeedback.classList.remove('is-error');
    sendFeedback.textContent = '';
    refreshUI(false);
    saveStatus.textContent = 'Ответы очищены';
  });

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyState(JSON.parse(saved));
  } catch {}

  refreshUI(false);
})();
