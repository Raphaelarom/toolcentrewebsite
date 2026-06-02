/* ============================================================
   PEAK — 6-week transformation tracker
   Profile: 5'11" (180cm), 77kg → 71kg goal, ~10% body fat.
   Pure vanilla JS. All data persisted to localStorage.
   ============================================================ */

const PROFILE = {
  heightCm: 180,
  startKg: 77,
  goalKg: 71,
  // 6-week plan starting "today" by default; user can re-weigh anytime.
  weeks: 6,
  ageDefault: 40, // used for BMR estimate; adjust in code if known
};

const STORE_KEY = 'peak.v1';

/* ---------- State ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = loadState() || {
  startDate: todayISO(),
  weighins: [],            // { date: 'YYYY-MM-DD', kg: 77.0 }
  doneSessions: {},        // { 'w1-d0': true, ... }
  foodChecks: {},          // { 'YYYY-MM-DD': { 0:true, ... } }
  viewWeek: 1,
};
// migrate any missing keys
state.doneSessions = state.doneSessions || {};
state.foodChecks = state.foodChecks || {};
state.viewWeek = state.viewWeek || 1;

/* ---------- Helpers ---------- */
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function fmt(n, dp = 1) { return Number(n).toFixed(dp); }

function latestWeight() {
  if (!state.weighins.length) return PROFILE.startKg;
  const sorted = [...state.weighins].sort((a,b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1].kg;
}
function totalDays() { return PROFILE.weeks * 7; }
function endDate() {
  const d = parseISO(state.startDate);
  d.setDate(d.getDate() + totalDays());
  return d;
}
function daysLeft() {
  const left = daysBetween(new Date(new Date().toDateString()), endDate());
  return Math.max(0, left);
}
// ideal weight on a given day index (linear 77 -> 71 over 42 days)
function idealKgAt(dayIndex) {
  const t = Math.min(1, Math.max(0, dayIndex / totalDays()));
  return PROFILE.startKg - (PROFILE.startKg - PROFILE.goalKg) * t;
}

/* ---------- Nutrition math ---------- */
function nutrition() {
  const w = latestWeight();
  const age = PROFILE.ageDefault;
  // Mifflin-St Jeor (male)
  const bmr = 10 * w + 6.25 * PROFILE.heightCm - 5 * age + 5;
  // Active: 6 sessions/week -> ~1.55 multiplier
  const tdee = bmr * 1.55;
  // Target ~0.85 kg/week loss is the sustainable side of a 1kg goal.
  // Use ~20% deficit but floor protein high to protect muscle.
  let cal = Math.round((tdee * 0.78) / 10) * 10;
  // protein 2.0 g/kg (muscle protection in a cut)
  const protein = Math.round(w * 2.0);
  // fat ~0.8 g/kg
  const fat = Math.round(w * 0.8);
  const calFromPF = protein * 4 + fat * 9;
  const carbs = Math.max(60, Math.round((cal - calFromPF) / 4));
  return { tdee: Math.round(tdee), cal, protein, carbs, fat, deficit: Math.round(tdee - cal) };
}

/* ============================================================
   6-WEEK TRAINING PLAN
   Mix: 2x Hyrox HIIT, 2x weights (extra LEG focus), 2-3x runs, IF.
   Progressive overload week to week. Legs prioritised (the goal).
   ============================================================ */
const RUN_PROG = ['5 km easy','6 km steady','6 km tempo','7 km steady','8 km tempo','5 km hard'];
const INTERVALS = [
  '4×400 m @ hard, 90s jog',
  '5×400 m @ hard, 90s jog',
  '6×400 m @ hard, 75s jog',
  '5×600 m @ hard, 90s jog',
  '6×600 m @ hard, 75s jog',
  '8×200 m flat-out, full recover',
];

function weekPlan(week) {
  const i = week - 1;
  const focus = [
    'Foundation — groove the movements, build the habit.',
    'Build — add load on legs, extend the runs.',
    'Push — intensity climbs, dial in nutrition.',
    'Peak volume — biggest week, lean hard on legs.',
    'Sharpen — intensity up, volume holds.',
    'Finish & reveal — push, then taper into the photo.',
  ][i];

  // Leg-day progressive overload cues
  const legCue = [
    '3×8 each: back squat, Bulgarian split squat, RDL, walking lunge, calf raise. Leave 2 reps in tank.',
    '4×8: back squat, Bulgarian split squat, RDL, walking lunge, calf raise. +2.5–5kg vs wk1.',
    '4×6–8 heavier: squat, RDL, split squat; finish 3×12 leg extension + calf.',
    '5×5 squat (heavy) + 4×8 RDL, hip thrust, split squat. Biggest leg day.',
    '4×6 squat + 4×8 RDL + 3×15 walking lunge burnout. Quality reps.',
    '3×5 squat (moderate) + pump work. Keep legs full, not trashed.',
  ][i];

  const upperCue = [
    '3×8: bench/push-up, row, overhead press, pull-up/lat pulldown, curls.',
    '4×8: bench, row, OHP, pull-up, face pull + curls. +load vs wk1.',
    '4×6–8 heavier press & row; 3×12 lateral raise + arms finisher.',
    '5×5 bench + weighted pull-ups + OHP. Push the load.',
    '4×6 press/pull + delt & arm pump for the taper look.',
    '3×8 full-body pump — shoulders, back, arms for the photo.',
  ][i];

  const hyroxCue = [
    '35 min: 4 rounds — 500m row, 20 wall balls, 15 burpees, 200m run. Steady.',
    '40 min: 4 rounds — 600m ski/row, 20 wall balls, 20 lunges, 250m run.',
    '40 min: 5 rounds — 500m row, 15 sandbag lunges, 15 burpee broad jumps, 200m run.',
    '45 min: 5 rounds — sled push/pull, wall balls, farmers carry, 300m run. Hardest.',
    '40 min: 5 fast rounds — row, burpees, lunges, run. Race pace.',
    '30 min: 3 sharp rounds — keep it crisp, no junk fatigue.',
  ][i];

  const sat = [
    { type:'hyrox', title:'Hyrox HIIT #2', detail: hyroxCue },
    { type:'hyrox', title:'Hyrox HIIT #2', detail: hyroxCue },
    { type:'hyrox', title:'Hyrox HIIT #2 + 3 km easy jog', detail: hyroxCue + ' Then 3 km flush jog.' },
    { type:'hyrox', title:'Hyrox HIIT #2 (peak)', detail: hyroxCue },
    { type:'hyrox', title:'Hyrox HIIT #2', detail: hyroxCue },
    { type:'hyrox', title:'Hyrox HIIT #2 (sharp)', detail: hyroxCue },
  ][i];

  return {
    week, focus,
    days: [
      { dow:'Mon', type:'legs',     title:'LOWER strength (leg priority)', detail: legCue },
      { dow:'Tue', type:'run',      title:`Run — ${RUN_PROG[i]}`, detail:'Zone 2, nose-breathing pace. Easy means easy.' },
      { dow:'Wed', type:'hyrox',    title:'Hyrox HIIT #1', detail: hyroxCue },
      { dow:'Thu', type:'upper',    title:'UPPER strength', detail: upperCue },
      { dow:'Fri', type:'run',      title:`Run intervals — ${INTERVALS[i]}`, detail:'Warm up 10 min. Feed carbs beforehand.' },
      { dow:'Sat', type: sat.type,  title: sat.title, detail: sat.detail },
      { dow:'Sun', type:'rest',     title:'Rest / mobility + cheat meal', detail:'Walk, stretch, foam roll. Put your one cheat meal here or on Sat.' },
    ],
  };
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  renderDashboard();
  renderWeight();
  renderPlan();
  renderNutrition();
  saveState();
}

function renderDashboard() {
  const cur = latestWeight();
  const lost = PROFILE.startKg - cur;
  const remaining = cur - PROFILE.goalKg;
  const totalToLose = PROFILE.startKg - PROFILE.goalKg;
  const pct = Math.min(100, Math.max(0, (lost / totalToLose) * 100));

  $('#d-current').textContent = fmt(cur);
  $('#d-goal').textContent = PROFILE.goalKg;
  $('#d-lost').textContent = `${fmt(Math.max(0,lost))} kg lost`;
  $('#d-remaining').textContent = `${fmt(Math.max(0,remaining))} kg to go`;
  $('#d-progress').style.width = pct + '%';
  $('#d-days').textContent = daysLeft();

  // current week target (ideal weight at end of current week)
  const dayIdx = daysBetween(parseISO(state.startDate), new Date(new Date().toDateString()));
  const weekNo = Math.min(PROFILE.weeks, Math.max(1, Math.ceil((dayIdx + 1) / 7)));
  const weekTarget = idealKgAt(weekNo * 7);
  $('#d-weektarget').innerHTML = `${fmt(weekTarget)}<small>kg</small>`;

  // pace
  const idealNow = idealKgAt(Math.max(0, dayIdx));
  let status, pace;
  if (cur <= idealNow + 0.05) { status = 'On track ✅'; pace = 'On / ahead'; }
  else if (cur <= idealNow + 0.6) { status = 'Close — tighten up'; pace = 'Slightly behind'; }
  else { status = 'Behind — refocus'; pace = 'Behind'; }
  if (state.weighins.length === 0) { status = "Let's go 💪"; pace = '—'; }
  $('#d-status').textContent = status;
  $('#d-pace').textContent = pace;

  // today's workout
  $('#d-today-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  const dow = new Date().getDay(); // 0 Sun..6 Sat
  const planIdx = (dow + 6) % 7;   // Mon=0
  const plan = weekPlan(weekNo);
  const day = plan.days[planIdx];
  $('#d-today-workout').innerHTML = `
    <div class="today-item">
      <span class="pill ${day.type}">${day.type.toUpperCase()}</span>
      <div><b>${day.title}</b><br><span class="muted" style="margin:0">${day.detail}</span></div>
    </div>`;

  // coach note
  $('#d-coach').textContent = coachNote(cur, idealNow, remaining);
}

function coachNote(cur, idealNow, remaining) {
  if (state.weighins.length === 0)
    return "Log your first weigh-in to start tracking. Remember: the scale dips fast in week 1 (water + glycogen), then settles to real fat loss. Hit your protein, protect your legs in the gym, and keep drinking to one occasion this week.";
  if (remaining <= 0)
    return "🎯 You hit 71 kg. Now it's about the look — keep protein high, keep the leg work, and consider easing the deficit so you hold muscle. Time for the photo.";
  if (cur > idealNow + 0.6)
    return "You're a touch behind the ideal line. Most likely culprit: the cheat day or a drinking night. Tighten the deficit this week, move your cheat to a single meal on a training day, and add one extra Zone-2 run.";
  return "Right on pace — nice work. Keep the lifts heavy on legs to fill them out while the fat comes off. Sleep 7–8h; recovery is where the look is built.";
}

/* ---------- Weight view ---------- */
function renderWeight() {
  if (!$('#w-date').value) $('#w-date').value = todayISO();
  const tbody = $('#weight-table tbody');
  const sorted = [...state.weighins].sort((a,b) => b.date.localeCompare(a.date));
  tbody.innerHTML = '';
  $('#weight-empty').style.display = sorted.length ? 'none' : 'block';
  $('#weight-table').style.display = sorted.length ? 'table' : 'none';

  sorted.forEach((w, i) => {
    const prev = sorted[i + 1];
    let delta = '';
    if (prev) {
      const d = w.kg - prev.kg;
      const cls = d < 0 ? 'delta-down' : d > 0 ? 'delta-up' : '';
      delta = `<span class="${cls}">${d > 0 ? '+' : ''}${fmt(d)}</span>`;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(w.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</td>
      <td><b>${fmt(w.kg)}</b> kg</td>
      <td>${delta}</td>
      <td style="text-align:right"><button class="del-btn" data-date="${w.date}">✕</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.del-btn').forEach(b =>
    b.addEventListener('click', () => {
      state.weighins = state.weighins.filter(x => x.date !== b.dataset.date);
      render();
    }));

  drawChart();
}

/* ---------- Canvas chart ---------- */
function drawChart() {
  const cv = $('#chart');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);

  const padL = 46, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const yMax = PROFILE.startKg + 1.5;
  const yMin = PROFILE.goalKg - 1.5;
  const x = i => padL + (plotW * i) / totalDays();
  const y = kg => padT + plotH * (1 - (kg - yMin) / (yMax - yMin));

  // grid + y labels
  ctx.strokeStyle = '#243150'; ctx.fillStyle = '#8a96b2';
  ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let kg = Math.ceil(yMin); kg <= Math.floor(yMax); kg++) {
    const yy = y(kg);
    ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillText(kg + '', padL - 8, yy);
  }

  // x labels (weeks)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let wk = 0; wk <= PROFILE.weeks; wk++) {
    const xx = x(wk * 7);
    ctx.fillText('W' + wk, xx, H - padB + 6);
  }

  // ideal line 77 -> 71
  ctx.strokeStyle = '#5b8cff'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(x(0), y(PROFILE.startKg)); ctx.lineTo(x(totalDays()), y(PROFILE.goalKg)); ctx.stroke();
  ctx.setLineDash([]);

  // goal line
  ctx.strokeStyle = '#38e0a6'; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, y(PROFILE.goalKg)); ctx.lineTo(W - padR, y(PROFILE.goalKg)); ctx.stroke();
  ctx.globalAlpha = 1;

  // actual data
  const sorted = [...state.weighins].sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length) {
    ctx.strokeStyle = '#38e0a6'; ctx.lineWidth = 3; ctx.beginPath();
    sorted.forEach((w, i) => {
      const di = Math.max(0, Math.min(totalDays(), daysBetween(parseISO(state.startDate), parseISO(w.date))));
      const px = x(di), py = y(w.kg);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    // points
    ctx.fillStyle = '#38e0a6';
    sorted.forEach(w => {
      const di = Math.max(0, Math.min(totalDays(), daysBetween(parseISO(state.startDate), parseISO(w.date))));
      ctx.beginPath(); ctx.arc(x(di), y(w.kg), 4, 0, Math.PI * 2); ctx.fill();
    });
  }
}

/* ---------- Plan view ---------- */
function renderPlan() {
  const week = state.viewWeek;
  const plan = weekPlan(week);
  $('#plan-week-title').textContent = `Week ${week}`;
  $('#plan-week-focus').textContent = plan.focus;

  const container = $('#plan-days');
  container.innerHTML = '';
  let done = 0, trainable = 0;
  plan.days.forEach((day, idx) => {
    const key = `w${week}-d${idx}`;
    const isDone = !!state.doneSessions[key];
    if (day.type !== 'rest') { trainable++; if (isDone) done++; }
    const el = document.createElement('div');
    el.className = 'day-card' + (isDone ? ' done' : '');
    el.innerHTML = `
      <div class="day-head">
        <span class="pill ${day.type}">${day.type.toUpperCase()}</span>
        <span class="dow">${day.dow}</span>
        <button class="check" data-key="${key}">✓</button>
      </div>
      <p class="day-title"><b>${day.title}</b></p>
      <p class="day-detail">${day.detail}</p>`;
    container.appendChild(el);
  });
  container.querySelectorAll('.check').forEach(b =>
    b.addEventListener('click', () => {
      const k = b.dataset.key;
      state.doneSessions[k] = !state.doneSessions[k];
      render();
    }));

  const pct = trainable ? (done / trainable) * 100 : 0;
  $('#plan-progress').style.width = pct + '%';
  $('#plan-progress-label').textContent = `${done} / ${trainable} sessions done`;
}

/* ---------- Nutrition view ---------- */
function renderNutrition() {
  const n = nutrition();
  $('#n-cal').textContent = n.cal;
  $('#n-pro').textContent = n.protein;
  $('#n-carb').textContent = n.carbs;
  $('#n-fat').textContent = n.fat;
  $('#n-explain').innerHTML =
    `Your estimated maintenance is ~<b>${n.tdee} kcal</b> with your training load. ` +
    `We're eating <b>${n.cal} kcal</b> — a ~${n.deficit} kcal/day deficit, which targets roughly 0.7–0.9 kg/week of mostly fat loss. ` +
    `Protein is set high (<b>${n.protein}g</b>) so the weight you lose is fat, not the leg muscle you're trying to build. Recalculates as your weight drops.`;

  // daily food checklist (resets per day)
  const today = todayISO();
  const checks = state.foodChecks[today] || {};
  const items = [
    'Hit protein target (aim 30–40g per meal)',
    'First meal within your eating window (12:00)',
    'Last bite before 20:00 (close the window)',
    '2–3 L water + electrolytes',
    'Veg / fibre with 2 meals',
    'No alcohol today (or it\'s your one planned occasion)',
    '7–8 hours sleep last night',
  ];
  const wrap = $('#n-checklist');
  wrap.innerHTML = '';
  items.forEach((label, i) => {
    const on = !!checks[i];
    const el = document.createElement('div');
    el.className = 'today-item' + (on ? ' checked' : '');
    el.innerHTML = `<span class="cbox">✓</span><span>${label}</span>`;
    el.addEventListener('click', () => {
      state.foodChecks[today] = state.foodChecks[today] || {};
      state.foodChecks[today][i] = !state.foodChecks[today][i];
      render();
    });
    wrap.appendChild(el);
  });
}

/* ============================================================
   WIRING
   ============================================================ */
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return document.querySelectorAll(sel); }

$('#tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  $all('.tab').forEach(t => t.classList.remove('active'));
  $all('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  $('#view-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'weight') drawChart();
});

$('#weight-form').addEventListener('submit', e => {
  e.preventDefault();
  const date = $('#w-date').value;
  const kg = parseFloat($('#w-kg').value);
  if (!date || isNaN(kg)) return;
  // replace if same date already logged
  state.weighins = state.weighins.filter(w => w.date !== date);
  state.weighins.push({ date, kg });
  $('#w-kg').value = '';
  render();
});

$('#week-prev').addEventListener('click', () => {
  state.viewWeek = Math.max(1, state.viewWeek - 1); render();
});
$('#week-next').addEventListener('click', () => {
  state.viewWeek = Math.min(PROFILE.weeks, state.viewWeek + 1); render();
});

$('#reset-btn').addEventListener('click', () => {
  if (confirm('Reset all weigh-ins, checkmarks and progress? This cannot be undone.')) {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }
});

render();
