(() => {
  const form = document.getElementById('anketaForm');
  if (!form) return;

  const WEB3FORMS_KEY = '52f56e18-a755-4c09-9d03-ac11cfaa201c';
  const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
  const STORAGE_KEY = 'noorBriefV2';
  const TOTAL_Q = 18;

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

  function withCustom(mainVal, triggerVal, customVal) {
    if (!mainVal) return '';
    const triggers = Array.isArray(triggerVal) ? triggerVal : [triggerVal];
    return triggers.includes(mainVal) && customVal ? `${mainVal} (${customVal})` : mainVal;
  }

  function buildSections() {
    // 1. Уточнение по Японии
    const japan = [];
    const jpDates = withCustom(val('jp_dates_2'), 'Поставить новые даты', val('jp_new_dates'));
    if (jpDates) japan.push(`1. Новые даты: ${jpDates}`);

    // 2. BTS: Малайзия + Бали + Сингапур
    const btsMy = [];
    if (val('bts_my_year')) btsMy.push(`2. Год: ${val('bts_my_year')}`);
    const btsMyRoute = withCustom(val('bts_my_route'), 'Другой вариант', val('bts_my_route_custom'));
    if (btsMyRoute) btsMy.push(`2. Маршрут: ${btsMyRoute}`);
    const btsMyInc = [
      val('bts_my_breakfast') ? `завтраки — ${val('bts_my_breakfast')}` : '',
      val('bts_my_ins_visa') ? `страховка/виза — ${val('bts_my_ins_visa')}` : '',
      val('bts_my_transfer') ? `трансфер — ${val('bts_my_transfer')}` : '',
      val('bts_my_baggage') ? `багаж — ${val('bts_my_baggage')}` : ''
    ].filter(Boolean);
    if (btsMyInc.length) btsMy.push(`3. Условия: ${btsMyInc.join('; ')}`);

    // 3. BTS: Гонконг + Шанхай
    const btsHk = [];
    const btsHkDates = withCustom(
      val('bts_hk_dates'),
      ['6 дней / 5 ночей (точные даты укажу ниже)', 'Другие даты'],
      val('bts_hk_dates_custom')
    );
    if (btsHkDates) btsHk.push(`4. Даты и длительность: ${btsHkDates}`);
    const btsHkInc = [
      val('bts_hk_ins') ? `мед. страховка — ${val('bts_hk_ins')}` : '',
      val('bts_hk_baggage') ? `багаж — ${val('bts_hk_baggage')}` : '',
      val('bts_hk_visafree') ? `безвиз РК — ${val('bts_hk_visafree')}` : ''
    ].filter(Boolean);
    if (btsHkInc.length) btsHk.push(`5. Детали: ${btsHkInc.join('; ')}`);

    // 4. Stray Kids: Милан
    const skzMilan = [];
    if (val('skz_mi_layout')) skzMilan.push(`6. Подача на сайте: ${val('skz_mi_layout')}`);
    const skzMiYear = withCustom(val('skz_mi_year'), 'Другой', val('skz_mi_year_custom'));
    const skzMiDetails = [
      skzMiYear ? `год — ${skzMiYear}` : '',
      val('skz_mi_vip_dep') ? `вылет VIP — ${val('skz_mi_vip_dep')}` : '',
      val('skz_mi_euro_ticket') ? `билет в Евротуре — ${val('skz_mi_euro_ticket')}` : '',
      val('skz_mi_breakfast') ? `завтраки — ${val('skz_mi_breakfast')}` : ''
    ].filter(Boolean);
    if (skzMiDetails.length) skzMilan.push(`7. Детали: ${skzMiDetails.join('; ')}`);

    // 5. Stray Kids: Лангкави + Сингапур
    const skzSg = [];
    const skzSgDates = withCustom(val('skz_sg_dates'), 'Другие даты', val('skz_sg_dates_custom'));
    if (skzSgDates) skzSg.push(`8. Даты и длительность: ${skzSgDates}`);
    const skzSgDetails = [
      val('skz_sg_visa') ? `виза Сингапур — ${val('skz_sg_visa')}` : '',
      val('skz_sg_breakfast') ? `завтраки — ${val('skz_sg_breakfast')}` : '',
      val('skz_sg_ticket') ? `билет на концерт — ${val('skz_sg_ticket')}` : ''
    ].filter(Boolean);
    if (skzSgDetails.length) skzSg.push(`9. Детали: ${skzSgDetails.join('; ')}`);

    // 6. Евротур: Исландия
    const iceland = [];
    if (val('ice_order')) iceland.push(`10. Порядок городов: ${val('ice_order')}`);
    const iceYear = withCustom(val('ice_year'), 'Другие даты', val('ice_year_custom'));
    if (iceYear) iceland.push(`10. Год: ${iceYear}`);
    const iceConcert = withCustom(val('ice_concert_typo'), 'Нет, оставить', val('ice_concert_custom'));
    const iceDetails = [
      val('ice_dep') ? `вылет — ${val('ice_dep')}` : '',
      val('ice_breakfast') ? `завтраки — ${val('ice_breakfast')}` : '',
      iceConcert ? `строка «Билет на концерт» — ${iceConcert}` : ''
    ].filter(Boolean);
    if (iceDetails.length) iceland.push(`11. Детали: ${iceDetails.join('; ')}`);

    // 7. Общие условия и каталог
    const common = [];
    const newGroup = withCustom(val('new_group'), 'На концертные туры больше', val('new_group_custom'));
    if (newGroup) common.push(`12. Размер групп: ${newGroup}`);
    const newPay = withCustom(val('new_pay'), 'Разные условия (укажу ниже)', val('new_pay_custom'));
    if (newPay) common.push(`13. Предоплата и возврат: ${newPay}`);
    const newVisaFee = withCustom(val('new_visa_fee'), 'Зависит от тура', val('new_visa_fee_custom'));
    if (newVisaFee) common.push(`14. Консульские сборы: ${newVisaFee}`);
    const guidePace = [
      val('new_guide').length ? `гид — ${val('new_guide').join(', ')}` : '',
      val('new_pace') ? `темп — ${val('new_pace')}` : ''
    ].filter(Boolean);
    if (guidePace.length) common.push(`15. Гид и темп: ${guidePace.join('; ')}`);
    if (val('concert_visual')) common.push(`16. Стиль концертных страниц: ${val('concert_visual')}`);

    const homeTours = val('home_tours');
    const keepSoon = val('keep_soon');
    const catalogParts = [];
    if (homeTours.length) catalogParts.push(`на главную: ${homeTours.join(', ')}`);
    if (keepSoon.length) catalogParts.push(keepSoon.join(', '));
    if (catalogParts.length) common.push(`17. Главная и «Скоро»: ${catalogParts.join('; ')}`);

    if (val('notes2')) common.push(`18. Комментарии: ${val('notes2')}`);

    return {
      doneCount: countDone(),
      japan: japan.join('\n'),
      btsMy: btsMy.join('\n'),
      btsHk: btsHk.join('\n'),
      skzMilan: skzMilan.join('\n'),
      skzSg: skzSg.join('\n'),
      iceland: iceland.join('\n'),
      common: common.join('\n')
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

  form.addEventListener('input', () => refreshUI(true));
  form.addEventListener('change', () => refreshUI(true));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.querySelector('[name="botcheck"]')?.checked) return;

    const sections = buildSections();
    if (
      !sections.japan &&
      !sections.btsMy &&
      !sections.btsHk &&
      !sections.skzMilan &&
      !sections.skzSg &&
      !sections.iceland &&
      !sections.common
    ) {
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
      subject: 'Noor Travel — анкета №2 (новые туры)',
      from_name: 'Анкета №2 Noor Travel',
      botcheck: false,
      'Заполнено вопросов': `${sections.doneCount} из ${TOTAL_Q}`
    };
    if (sections.japan) payload['1. Уточнение по Японии'] = sections.japan;
    if (sections.btsMy) payload['2. BTS: Малайзия + Бали + Сингапур'] = sections.btsMy;
    if (sections.btsHk) payload['3. BTS: Гонконг + Шанхай'] = sections.btsHk;
    if (sections.skzMilan) payload['4. Stray Kids: Милан'] = sections.skzMilan;
    if (sections.skzSg) payload['5. Stray Kids: Лангкави + Сингапур'] = sections.skzSg;
    if (sections.iceland) payload['6. Евротур: Исландия'] = sections.iceland;
    if (sections.common) payload['7. Общие условия и каталог'] = sections.common;

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
