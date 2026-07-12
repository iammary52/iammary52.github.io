const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const koDate = (d) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
}).format(new Date(`${d}T00:00:00`));

const SUPABASE_URL = 'https://gftydfeqpuavajjzaeun.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_35lefXRrUU4MFrAATfghjQ_2EPkUgGy';
const TRIP_ID = 'hokkaido-2026';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

fetch('trip-data.json')
  .then((r) => r.json())
  .then((data) => render(data))
  .catch(() => document.body.insertAdjacentHTML(
    'beforeend',
    '<p style="text-align:center">여행 데이터를 불러오지 못했습니다.</p>'
  ));

function render(data) {
  $('#tripTitle').textContent = data.trip.title;
  $('#tripSubtitle').textContent = data.trip.subtitle;
  $('#tripDates').textContent = `${data.trip.startDate.replaceAll('-', '.')} — ${data.trip.endDate.replaceAll('-', '.')}`;
  updateCountdown(data.trip.startDate);

  $('#flightCards').innerHTML = data.flights.map((f) => `
    <article class="flight-card">
      <div class="flight-top"><span class="flight-type">${f.type}</span><span class="flight-date">${koDate(f.date)}</span></div>
      <div class="route">
        <div class="airport"><strong>${f.departure.code}</strong><span>${f.departure.time}</span><small>${f.departure.terminal}</small></div>
        <div class="route-line">${f.duration}</div>
        <div class="airport"><strong>${f.arrival.code}</strong><span>${f.arrival.time}</span><small>${f.arrival.terminal}</small></div>
      </div>
      <div class="flight-meta">
        <span class="pill">${f.flightNo}</span><span class="pill">${f.aircraft}</span>
        <span class="pill">${f.fare}</span><span class="pill">예약 클래스 ${f.bookingClass}</span>
      </div>
    </article>`).join('');

  $('#scheduleList').innerHTML = data.schedule.map((d, i) => `
    <article class="day-card">
      <div class="day-head"><strong>DAY ${i + 1} · ${d.dayTitle}</strong><span>${koDate(d.date)}</span></div>
      ${d.items.map((x) => `
        <div class="timeline-item">
          <div class="timeline-time">${x.time}</div>
          <div><div class="timeline-title">${x.title}</div><div class="timeline-detail">${x.detail}</div></div>
        </div>`).join('')}
    </article>`).join('');

  $('#bookingList').innerHTML = data.bookings.map((b) => `
    <article class="booking-card">
      <div class="booking-head"><span class="booking-cat">${b.category}</span><span class="status ${b.status.includes('검토') ? 'pending' : ''}">${b.status}</span></div>
      <h3>${b.name}</h3><p>${b.detail}</p>
    </article>`).join('');

  initChecklist(data.checklist);
}

function updateCountdown(start) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    const { data, error } = await db
      .from('trip_checklist')
      .select('id, item, is_done, sort_order')
      .eq('trip_id', TRIP_ID)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    if (!data.length && defaultItems?.length) {
      const rows = defaultItems.map((item, index) => ({
        trip_id: TRIP_ID,
        item,
        is_done: false,
        sort_order: index + 1
      }));
      const { error: insertError } = await db.from('trip_checklist').insert(rows);
      if (insertError) throw insertError;
      return load();
    }

    items = data;
    draw();
    status.textContent = '체크 상태는 Supabase에 저장되며 모든 기기에서 동일하게 보입니다.';
  }

  function draw() {
    $('#checklistItems').innerHTML = items.map((x) => `
      <label class="check-row ${x.is_done ? 'done' : ''}">
        <input type="checkbox" data-id="${x.id}" ${x.is_done ? 'checked' : ''}>
        <span>${escapeHtml(x.item)}</span>
        <button class="delete-btn" type="button" data-del="${x.id}" aria-label="삭제">×</button>
      </label>`).join('');

    $$('[data-id]').forEach((el) => {
      el.onchange = async () => {
        el.disabled = true;
        const { error } = await db
          .from('trip_checklist')
          .update({ is_done: el.checked, updated_at: new Date().toISOString() })
          .eq('id', Number(el.dataset.id))
          .eq('trip_id', TRIP_ID);
        if (error) {
          status.textContent = `저장 오류: ${error.message}`;
          el.checked = !el.checked;
        }
        await load();
      };
    });

    $$('[data-del]').forEach((el) => {
      el.onclick = async () => {
        el.disabled = true;
        const { error } = await db
          .from('trip_checklist')
          .delete()
          .eq('id', Number(el.dataset.del))
          .eq('trip_id', TRIP_ID);
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
    const { error } = await db.from('trip_checklist').insert({
      trip_id: TRIP_ID,
      item,
      is_done: false,
      sort_order: nextOrder
    });
    button.disabled = false;

    if (error) {
      status.textContent = `추가 오류: ${error.message}`;
      return;
    }
    input.value = '';
    await load();
  };

  try {
    await load();
  } catch (error) {
    status.textContent = `Supabase 연결 오류: ${error.message}`;
    $('#checklistItems').innerHTML = '<div class="check-row"><span>체크리스트를 불러오지 못했습니다.</span></div>';
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}
