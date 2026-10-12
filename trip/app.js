const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const koDate = (d) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
}).format(new Date(`${d}T00:00:00`));

const SUPABASE_URL = 'https://gftydfeqpuavajjzaeun.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_35lefXRrUU4MFrAATfghjQ_2EPkUgGy';
const TRIP_ID = 'sydney-2026';
const DATA_VERSION = '20261012-2';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

fetch(`trip-data.json?v=${DATA_VERSION}`, { cache: 'no-store' })
  .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then((data) => render(data))
  .catch(() => document.body.insertAdjacentHTML('beforeend', '<p style="text-align:center">여행 데이터를 불러오지 못했습니다.</p>'));

function render(data) {
  $('#tripTitle').textContent = data.trip.title;
  $('#tripSubtitle').textContent = data.trip.subtitle;
  $('#tripDates').textContent = `${data.trip.startDate.replaceAll('-', '.')} — ${data.trip.endDate.replaceAll('-', '.')}`;
  updateCountdown(data.trip.startDate);

  $('#flightCards').innerHTML = data.flights.map((f) => flightCard(f)).join('');
  $('#travelerCards').innerHTML = data.travelers.map((x) =>
    `<article class="summary-card"><span>${escapeHtml(x.label)}</span><strong>${escapeHtml(x.value)}</strong><small>${escapeHtml(x.detail)}</small></article>`
  ).join('');

  const lodgingCards = $('#lodgingCards');
  if (lodgingCards) lodgingCards.innerHTML = (data.lodgingPlan || []).map((x) => lodgingCard(x)).join('');
  initTripCalendar(data);

  $('#scheduleList').innerHTML = data.schedule.map((d, i) => `
    <article class="day-card">
      <div class="day-head"><strong>DAY ${i + 1} · ${escapeHtml(d.dayTitle)}</strong><span>${koDate(d.date)}</span></div>
      ${d.items.map((x) => `<div class="timeline-item"><div class="timeline-time">${escapeHtml(x.time)}</div><div><div class="timeline-title">${escapeHtml(x.title)}</div><div class="timeline-detail">${escapeHtml(x.detail)}</div></div></div>`).join('')}
    </article>`).join('');

  $('#bookingList').innerHTML = data.bookings.map((b) => `
    <article class="booking-card">
      <div class="booking-head"><span class="booking-cat">${escapeHtml(b.category)}</span><span class="status ${b.status.includes('미정') ? 'pending' : ''}">${escapeHtml(b.status)}</span></div>
      <h3>${escapeHtml(b.name)}</h3><p>${escapeHtml(b.detail)}</p>
    </article>`).join('');

  $('#lodgingCards').innerHTML = (data.lodgingPlan || []).map((x) => lodgingCard(x)).join('');
  $('#planningList').innerHTML = (data.planning || []).map((x) => candidateCard(x)).join('');
  renderCalendar(data.calendar);
  initChecklist(data.checklist);
}

function flightCard(f) {
  const meta = [
    f.flightNo,
    f.operatedBy,
    f.aircraft,
    f.fare,
    f.bookingClass ? `예약 클래스 ${f.bookingClass}` : '',
    f.mileage || '',
    f.status || ''
  ].filter(Boolean);

  return `<article class="flight-card">
    <div class="flight-top"><span class="flight-type">${escapeHtml(f.type)}</span><span class="flight-date">${koDate(f.date)}</span></div>
    <div class="route">
      <div class="airport"><strong>${escapeHtml(f.departure.code)}</strong><span>${escapeHtml(f.departure.time)}</span><small>${escapeHtml(f.departure.city)}</small></div>
      <div class="route-line">${escapeHtml(f.duration)}</div>
      <div class="airport"><strong>${escapeHtml(f.arrival.code)}</strong><span>${escapeHtml(f.arrival.time)}</span><small>${escapeHtml(f.arrival.city)}</small></div>
    </div>
    <div class="flight-meta">${meta.map((m) => `<span class="pill">${escapeHtml(m)}</span>`).join('')}</div>
  </article>`;
}

function lodgingCard(x) {
  const statusClass = x.status.includes('예정') ? 'planned' : x.status.includes('고려') ? 'considering' : 'pending';
  return `<article class="lodging-card">
    <div class="lodging-top"><span class="lodging-period">${escapeHtml(x.period)}</span><span class="lodging-status ${statusClass}">${escapeHtml(x.status)}</span></div>
    <h3>${escapeHtml(x.name)}</h3>
    <strong class="lodging-nights">${escapeHtml(x.nights)}</strong>
    <p class="lodging-area">${escapeHtml(x.area)}</p>
    <p>${escapeHtml(x.detail)}</p>
    ${x.url ? `<a class="link-button" href="${x.url}" target="_blank" rel="noopener noreferrer">호텔 보기 ↗</a>` : ''}
  </article>`;
}

function renderCalendar(calendar) {
  const el = $('#travelCalendar');
  const title = $('#calendarTitle');
  if (!el || !calendar) return;

  title.textContent = calendar.title || '';
  const year = Number(calendar.year);
  const month = Number(calendar.month);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const eventsByDate = {};
  (calendar.events || []).forEach((event) => {
    (eventsByDate[event.date] ||= []).push(event);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push('<div class="calendar-day blank"></div>');

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const events = eventsByDate[key] || [];
    const inTrip = key >= '2026-12-17' && key <= '2026-12-24';
    cells.push(`<div class="calendar-day ${inTrip ? 'trip-day' : ''}">
      <div class="calendar-date">${day}</div>
      <div class="calendar-events">
        ${events.map((e) => `<div class="calendar-event ${escapeHtml(e.type || 'open')}"><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.detail || '')}</span></div>`).join('')}
      </div>
    </div>`);
  }

  while (cells.length % 7) cells.push('<div class="calendar-day blank"></div>');
  el.innerHTML = cells.join('');
}

function candidateCard(x) {
  return `<article class="candidate-card">
    <div class="candidate-head"><span>${escapeHtml(x.category || '준비')}</span><span class="rating">${escapeHtml(x.recommendation || '검토')}</span></div>
    <h3>${escapeHtml(x.name)}</h3>
    <p>${escapeHtml(x.detail)}</p>
    ${x.price ? `<strong class="candidate-price">${escapeHtml(x.price)}</strong>` : ''}
    ${x.url ? `<a class="link-button" href="${x.url}" target="_blank" rel="noopener noreferrer">열어보기 ↗</a>` : ''}
  </article>`;
}

function initTripCalendar(data) {
  const root = $('#tripCalendar');
  const title = $('#calendarMonthTitle');
  if (!root || !title) return;

  let viewYear = 2026;
  let viewMonth = 11; // December, zero-based
  const startDate = data.trip.startDate;
  const endDate = data.trip.endDate;
  const eventMap = {};
  (data.calendarEvents || []).forEach((e) => {
    if (!eventMap[e.date]) eventMap[e.date] = [];
    eventMap[e.date].push(e);
  });

  const renderMonth = () => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = first.getDay();
    title.textContent = `${viewYear}년 ${viewMonth + 1}월`;
    const cells = [];

    for (let i = 0; i < leading; i++) cells.push('<div class="calendar-day outside"></div>');

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const inTrip = date >= startDate && date <= endDate;
      const events = eventMap[date] || [];
      const classes = ['calendar-day', inTrip ? 'in-trip' : ''];
      const eventHtml = events.map((e) =>
        `<div class="cal-event ${escapeHtml(e.type)}" title="${escapeHtml(e.detail || '')}"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.detail || '')}</small></div>`
      ).join('');
      cells.push(`<div class="${classes.filter(Boolean).join(' ')}"><div class="calendar-date"><span>${day}</span>${inTrip ? '<b>TRIP</b>' : ''}</div>${eventHtml}</div>`);
    }

    const used = leading + daysInMonth;
    const trailing = (7 - (used % 7)) % 7;
    for (let i = 0; i < trailing; i++) cells.push('<div class="calendar-day outside"></div>');
    root.innerHTML = cells.join('');
  };

  $('#calendarPrev').onclick = () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderMonth();
  };
  $('#calendarNext').onclick = () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderMonth();
  };

  renderMonth();
}

function updateCountdown(start) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${start}T00:00:00`);
  const days = Math.ceil((target - today) / 86400000);
  $('#countdown').textContent = days > 0 ? `출발까지 D-${days}` : days === 0 ? '오늘 출발' : '여행 일정';
}

$$('.tab').forEach((btn) => btn.addEventListener('click', () => {
  $$('.tab').forEach((x) => x.classList.remove('active'));
  $$('.panel').forEach((x) => x.classList.remove('active'));
  btn.classList.add('active');
  $(`#${btn.dataset.target}`).classList.add('active');
}));

async function initChecklist(defaultItems) {
  const status = $('#checkStatus');
  let items = [];

  async function load() {
    status.textContent = 'Supabase에서 체크리스트를 불러오는 중입니다.';
    const { data, error } = await db.from('trip_checklist')
      .select('id, item, is_done, sort_order')
      .eq('trip_id', TRIP_ID)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;

    if (!data.length && defaultItems?.length) {
      const rows = defaultItems.map((item, index) => ({ trip_id: TRIP_ID, item, is_done: false, sort_order: index + 1 }));
      const { error: insertError } = await db.from('trip_checklist').insert(rows);
      if (insertError) throw insertError;
      return load();
    }
    items = data;
    draw();
    status.textContent = '체크 상태는 Supabase에 저장되며 모든 기기에서 동일하게 보입니다.';
  }

  function draw() {
    $('#checklistItems').innerHTML = items.map((x) =>
      `<label class="check-row ${x.is_done ? 'done' : ''}"><input type="checkbox" data-id="${x.id}" ${x.is_done ? 'checked' : ''}><span>${escapeHtml(x.item)}</span><button class="delete-btn" type="button" data-del="${x.id}" aria-label="삭제">×</button></label>`
    ).join('');

    $$('[data-id]').forEach((el) => {
      el.onchange = async () => {
        el.disabled = true;
        const { error } = await db.from('trip_checklist').update({ is_done: el.checked, updated_at: new Date().toISOString() }).eq('id', Number(el.dataset.id)).eq('trip_id', TRIP_ID);
        if (error) { status.textContent = `저장 오류: ${error.message}`; el.checked = !el.checked; }
        await load();
      };
    });

    $$('[data-del]').forEach((el) => {
      el.onclick = async () => {
        el.disabled = true;
        const { error } = await db.from('trip_checklist').delete().eq('id', Number(el.dataset.del)).eq('trip_id', TRIP_ID);
        if (error) status.textContent = `삭제 오류: ${error.message}`;
        await load();
      };
    });
  }

  $('#checkForm').onsubmit = async (event) => {
    event.preventDefault();
    const input = $('#checkInput');
    const item = input.value.trim();
    if (!item) return;
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    const nextOrder = items.reduce((max, x) => Math.max(max, x.sort_order || 0), 0) + 1;
    const { error } = await db.from('trip_checklist').insert({ trip_id: TRIP_ID, item, is_done: false, sort_order: nextOrder });
    button.disabled = false;
    if (error) { status.textContent = `추가 오류: ${error.message}`; return; }
    input.value = '';
    await load();
  };

  try { await load(); }
  catch (error) {
    status.textContent = `Supabase 연결 오류: ${error.message}`;
    $('#checklistItems').innerHTML = '<div class="check-row"><span>체크리스트를 불러오지 못했습니다.</span></div>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}