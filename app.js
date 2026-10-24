// Constructor de equipos Pokémon Champions.
// Datos: PokeAPI (en tiempo de ejecución). Equipos guardados: localStorage.

const API = 'https://pokeapi.co/api/v2';
const SLOT_COUNT = 6;
const STORE_KEY = 'pc-teams-v1';

// Reglas de EVs (serie principal). Ajustar a las reglas reales de Pokémon Champions.
const EV_MAX_STAT = 252;
const EV_MAX_TOTAL = 510;

// Naturalezas: [stat subido, stat bajado], o null si es neutra.
const NATURES = {
  Hardy: null, Docile: null, Serious: null, Bashful: null, Quirky: null,
  Lonely: ['atk', 'def'], Brave: ['atk', 'spe'], Adamant: ['atk', 'spa'], Naughty: ['atk', 'spd'],
  Bold: ['def', 'atk'], Relaxed: ['def', 'spe'], Impish: ['def', 'spa'], Lax: ['def', 'spd'],
  Timid: ['spe', 'atk'], Hasty: ['spe', 'def'], Jolly: ['spe', 'spa'], Naive: ['spe', 'spd'],
  Modest: ['spa', 'atk'], Mild: ['spa', 'def'], Quiet: ['spa', 'spe'], Rash: ['spa', 'spd'],
  Calm: ['spd', 'atk'], Gentle: ['spd', 'def'], Sassy: ['spd', 'spe'], Careful: ['spd', 'spa'],
};

const STAT_FROM_API = {
  hp: 'hp', attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe',
};

const state = {
  team: blankTeam(),
  speciesMap: {}, // "Pikachu" -> "pikachu"
  details: {},    // slug -> { types, base, abilities, moves, sprite }
};

// ---------- Utilidades ----------

const $ = sel => document.querySelector(sel);

const cache = new Map();
function getJSON(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return cache.get(url);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function display(slug) {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function blankTeam() {
  return Array.from({ length: SLOT_COUNT }, () => emptySet());
}

function sumEV(evs) {
  return STAT_KEYS.reduce((a, k) => a + (evs[k] || 0), 0);
}

function clampEV(v) {
  return Math.max(0, Math.min(EV_MAX_STAT, parseInt(v, 10) || 0));
}

function detailFor(species) {
  const slug = state.speciesMap[species];
  return slug ? state.details[slug] : null;
}

let flashTimer;
function flash(msg) {
  const el = $('#status');
  el.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.textContent = ''; }, 2500);
}

// ---------- Datos (PokeAPI) ----------

async function loadSpeciesIndex() {
  const j = await getJSON(`${API}/pokemon?limit=2000`);
  const dl = $('#dl-species');
  dl.innerHTML = j.results.map(r => {
    const name = display(r.name);
    state.speciesMap[name] = r.name;
    return `<option value="${esc(name)}">`;
  }).join('');
}

async function loadItems() {
  const j = await getJSON(`${API}/item?limit=2500`);
  $('#dl-items').innerHTML = j.results.map(r => `<option value="${esc(display(r.name))}">`).join('');
}

async function loadDetail(species) {
  const slug = state.speciesMap[species];
  if (!slug) return null;
  if (!state.details[slug]) {
    const p = await getJSON(`${API}/pokemon/${slug}`);
    state.details[slug] = {
      types: p.types.map(t => display(t.type.name)),
      base: Object.fromEntries(p.stats.map(s => [STAT_FROM_API[s.stat.name], s.base_stat])),
      abilities: p.abilities.map(a => display(a.ability.name)),
      moves: p.moves.map(m => display(m.move.name)).sort(),
      sprite: p.sprites?.front_default || '',
    };
  }
  return state.details[slug];
}

// Estadísticas aproximadas: nivel 50, IV 31 (los EVs se pasan a /4 como en la serie principal).
function calcStats(base, evs, nature) {
  const out = {};
  const mod = NATURES[nature];
  for (const k of STAT_KEYS) {
    const b = base[k];
    const ev = Math.floor((evs[k] || 0) / 4);
    if (k === 'hp') {
      out[k] = Math.floor((2 * b + 31 + ev) * 50 / 100) + 60;
    } else {
      let v = Math.floor((2 * b + 31 + ev) * 50 / 100) + 5;
      if (mod && mod[0] === k) v = Math.floor(v * 1.1);
      if (mod && mod[1] === k) v = Math.floor(v * 0.9);
      out[k] = v;
    }
  }
  return out;
}

function natureLabel(n) {
  const m = NATURES[n];
  return m ? ` (+${STAT_LABELS[m[0]]} −${STAT_LABELS[m[1]]})` : '';
}

// ---------- Render ----------

function slotHTML(i, s) {
  const d = detailFor(s.species);
  const abilities = d ? d.abilities : (s.ability ? [s.ability] : []);
  const moveOpts = (d ? d.moves : []).map(m => `<option value="${esc(m)}">`).join('');

  return `
  <article class="slot" data-slot="${i}">
    <div class="slot-head">
      <span class="num">${i + 1}</span>
      ${d?.sprite ? `<img src="${esc(d.sprite)}" alt="" width="48" height="48">` : ''}
      <input class="species" data-f="species" list="dl-species" value="${esc(s.species)}" placeholder="Pokémon">
    </div>
    <label>Objeto
      <input data-f="item" list="dl-items" value="${esc(s.item)}" placeholder="Objeto">
    </label>
    <label>Habilidad
      <select data-f="ability">
        ${abilities.map(a => `<option ${a === s.ability ? 'selected' : ''}>${esc(a)}</option>`).join('')}
      </select>
    </label>
    <label>Naturaleza
      <select data-f="nature">
        ${Object.keys(NATURES).map(n => `<option value="${n}" ${n === s.nature ? 'selected' : ''}>${n}${natureLabel(n)}</option>`).join('')}
      </select>
    </label>
    <div class="evs">
      ${STAT_KEYS.map(k => `
        <label>${STAT_LABELS[k]}
          <input type="number" min="0" max="${EV_MAX_STAT}" step="4" data-ev="${k}" value="${s.evs[k]}">
        </label>`).join('')}
      <span class="ev-total"></span>
    </div>
    <div class="moves">
      ${s.moves.map((m, j) => `
        <input data-move="${j}" list="moves-${i}" value="${esc(m)}" placeholder="Movimiento ${j + 1}">`).join('')}
    </div>
    <datalist id="moves-${i}">${moveOpts}</datalist>
    <div class="stats"></div>
  </article>`;
}

function statsHTML(s) {
  const d = detailFor(s.species);
  if (!d) return '';
  const st = calcStats(d.base, s.evs, s.nature);
  return `
    <div class="types">${d.types.map(t => `<span class="type">${esc(t)}</span>`).join('')}</div>
    <div class="statline">${STAT_KEYS.map(k => `<span><b>${STAT_LABELS[k]}</b> ${st[k]}</span>`).join('')}</div>
    <small>Estimación: nivel 50, IV 31.</small>`;
}

function updateSlotMeta(i) {
  const art = document.querySelector(`.slot[data-slot="${i}"]`);
  if (!art) return;
  const s = state.team[i];
  const total = sumEV(s.evs);
  const t = art.querySelector('.ev-total');
  t.textContent = `EVs: ${total}/${EV_MAX_TOTAL}`;
  t.classList.toggle('bad', total > EV_MAX_TOTAL);
  art.querySelector('.stats').innerHTML = statsHTML(s);
}

function renderSlot(i) {
  const tmp = document.createElement('div');
  tmp.innerHTML = slotHTML(i, state.team[i]);
  $('#slots').children[i].replaceWith(tmp.firstElementChild);
  updateSlotMeta(i);
}

function renderSlots() {
  $('#slots').innerHTML = state.team.map((s, i) => slotHTML(i, s)).join('');
  state.team.forEach((_, i) => updateSlotMeta(i));
}

function updateOutput() {
  $('#paste-out').value = state.team
    .filter(s => s.species)
    .map(toPaste)
    .join('\n\n');
}

function renderTeamList() {
  const all = getSaved();
  const names = Object.keys(all);
  $('#team-list').innerHTML = names.length
    ? names.map(n => `
      <li>
        <span>${esc(n)} <small>(${all[n].filter(s => s.species).length} Pokémon)</small></span>
        <span>
          <button type="button" data-act="load" data-name="${esc(n)}">Cargar</button>
          <button type="button" data-act="del" data-name="${esc(n)}">Borrar</button>
        </span>
      </li>`).join('')
    : '<li>No hay equipos guardados.</li>';
}

// ---------- Acciones de equipo ----------

async function preloadTeam(team) {
  await Promise.all(team.map(s => s.species
    ? loadDetail(s.species).catch(() => null)
    : null));
}

async function onSpeciesChanged(i, value) {
  const s = state.team[i];
  s.species = value.trim();
  s.name = s.species;
  s.ability = '';
  s.moves = ['', '', '', ''];
  if (state.speciesMap[s.species]) {
    const d = await loadDetail(s.species);
    s.ability = d.abilities[0] || '';
  }
  renderSlot(i);
  updateOutput();
}

function getSaved() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
}

function setSaved(obj) {
  localStorage.setItem(STORE_KEY, JSON.stringify(obj));
}

function saveTeam() {
  const name = $('#team-name').value.trim() || 'Equipo sin nombre';
  const all = getSaved();
  all[name] = structuredClone(state.team);
  setSaved(all);
  renderTeamList();
  flash(`Guardado: ${name}`);
}

async function loadTeam(name) {
  const all = getSaved();
  if (!all[name]) return;
  state.team = structuredClone(all[name]);
  $('#team-name').value = name;
  await preloadTeam(state.team);
  renderSlots();
  updateOutput();
  flash(`Cargado: ${name}`);
}

function newTeam() {
  state.team = blankTeam();
  $('#team-name').value = '';
  renderSlots();
  updateOutput();
}

async function importText(text) {
  text = text.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      text = await (await fetch(text.replace(/\/$/, '') + '/raw')).text();
    } catch {
      alert('No se pudo leer ese enlace desde la web. Abre el Pokepaste, copia su texto y pégalo aquí.');
      return;
    }
  }

  const sets = parsePaste(text).slice(0, SLOT_COUNT);
  if (!sets.length) {
    alert('No encontré ningún Pokémon en ese texto.');
    return;
  }

  state.team = [...sets, ...Array.from({ length: SLOT_COUNT - sets.length }, () => emptySet())];
  await preloadTeam(state.team);
  renderSlots();
  updateOutput();
  flash(`Importados ${sets.length} Pokémon`);
}

// ---------- Eventos ----------

$('#slots').addEventListener('input', e => {
  const art = e.target.closest('.slot');
  if (!art) return;
  const i = +art.dataset.slot;
  const s = state.team[i];
  const el = e.target;

  if (el.dataset.ev) {
    s.evs[el.dataset.ev] = clampEV(el.value);
    updateSlotMeta(i);
  } else if (el.dataset.move !== undefined) {
    s.moves[+el.dataset.move] = el.value.trim();
  } else if (el.dataset.f === 'item') {
    s.item = el.value.trim();
  }
  updateOutput();
});

$('#slots').addEventListener('change', async e => {
  const art = e.target.closest('.slot');
  if (!art) return;
  const i = +art.dataset.slot;
  const s = state.team[i];
  const f = e.target.dataset.f;

  if (f === 'species') {
    await onSpeciesChanged(i, e.target.value);
    return;
  }
  if (f === 'ability') s.ability = e.target.value;
  if (f === 'nature') {
    s.nature = e.target.value;
    updateSlotMeta(i);
  }
  updateOutput();
});

$('#btn-new').addEventListener('click', newTeam);
$('#btn-save').addEventListener('click', saveTeam);

$('#team-list').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const name = b.dataset.name;
  if (b.dataset.act === 'load') {
    loadTeam(name);
  } else if (confirm(`¿Borrar "${name}"?`)) {
    const all = getSaved();
    delete all[name];
    setSaved(all);
    renderTeamList();
  }
});

$('#btn-copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#paste-out').value);
  flash('Pokepaste copiado');
});

$('#btn-download').addEventListener('click', () => {
  const blob = new Blob([$('#paste-out').value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = ($('#team-name').value.trim() || 'equipo').replace(/\s+/g, '_') + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#btn-import-open').addEventListener('click', () => $('#import-dialog').showModal());
$('#btn-import-cancel').addEventListener('click', () => $('#import-dialog').close());
$('#btn-import-go').addEventListener('click', async () => {
  const text = $('#import-text').value;
  $('#import-dialog').close();
  $('#import-text').value = '';
  await importText(text);
});

// ---------- Init ----------

async function init() {
  renderSlots();
  updateOutput();
  renderTeamList();

  loadSpeciesIndex().catch(() => flash('No se pudo cargar la lista de Pokémon (PokeAPI)'));
  loadItems().catch(() => {});
}

init();
