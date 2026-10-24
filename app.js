// Constructor de equipos Pokémon Champions.
// Datos: PokeAPI (en tiempo de ejecución) + data/regulations.js (lista por regulación).
// Equipos guardados: localStorage.

const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const SLOT_COUNT = 6;
const STORE_KEY = 'pc-teams-v2';

// Pokémon Champions: puntos de estadística (PC), nivel 50 e IV 31 fijos.
const PC_MAX_STAT = 32;
const PC_MAX_TOTAL = 66;

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

const REG = window.REGULATIONS;
const ES = window.NAMES_ES || { species: {}, items: {} };

const state = {
  regulation: REG.current,
  team: blankTeam(),
  speciesMap: {},   // "Pikachu" -> "pikachu"
  speciesId: {},   // "Pikachu" -> 25
  itemMap: {},      // "Choice Scarf" -> "choice-scarf"
  itemSprites: {},  // "Choice Scarf" -> url
  moveMap: {},     // "Fake Out" -> "fake-out"
  abilityMap: {},  // "Intimidate" -> "intimidate"
  details: {},      // slug -> { types, base, abilities, moves, sprite }
};

let pickIndex = 0;

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

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function display(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

const STAT_ES = { hp: 'PS', atk: 'Atq', def: 'Def', spa: 'AtE', spd: 'DfE', spe: 'Vel' };

function kindMap(kind) {
  return { species: state.speciesMap, items: state.itemMap, moves: state.moveMap, abilities: state.abilityMap }[kind];
}

// Nombre en español para mostrar; el nombre interno sigue siendo el inglés (formato Showdown).
function esName(kind, english) {
  if (kind === 'natures') return ES.natures[english.toLowerCase()] || english;
  const slug = kindMap(kind)?.[english];
  return (slug && ES[kind][slug]) || english;
}

const revNames = { species: new Map(), items: new Map(), moves: new Map(), abilities: new Map() };
function buildRev(kind) {
  const map = kindMap(kind);
  revNames[kind].clear();
  for (const english of Object.keys(map)) {
    revNames[kind].set(norm(english), english);
    revNames[kind].set(norm(esName(kind, english)), english);
  }
}

// Texto escrito o elegido (español o inglés) -> nombre interno en inglés.
function fromEs(kind, text) {
  const t = String(text ?? '').trim();
  return revNames[kind].get(norm(t)) || t;
}

function spriteUrl(id) {
  return id ? `${SPRITES}/${id}.png` : '';
}

function blankTeam() {
  return Array.from({ length: SLOT_COUNT }, () => emptySet());
}

function sumEV(evs) {
  return STAT_KEYS.reduce((a, k) => a + (evs[k] || 0), 0);
}

function clampEV(v) {
  return Math.max(0, Math.min(PC_MAX_STAT, parseInt(v, 10) || 0));
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

// ---------- Regulación ----------

function currentReg() {
  return REG.list.find(r => r.id === state.regulation) || REG.list[0];
}

function allowedSet(reg) {
  if (!reg._set) reg._set = new Set(reg.pokemon.map(norm));
  return reg._set;
}

// Acepta la especie base y sus formas (p. ej. "toxtricity-amped" -> Toxtricity).
function isAllowedSpecies(species) {
  const reg = currentReg();
  if (!reg.pokemon) return true;
  const slug = state.speciesMap[species];
  if (!slug) return false;
  const set = allowedSet(reg);
  return set.has(norm(species)) || set.has(norm(slug.split('-')[0]));
}

function allowedSpeciesNames() {
  return Object.keys(state.speciesMap)
    .filter(n => isAllowedSpecies(n))
    .sort((a, b) => (state.speciesId[a] || 0) - (state.speciesId[b] || 0));
}

function renderRegulationSelect() {
  $('#reg-select').innerHTML = REG.list
    .map(r => `<option value="${esc(r.id)}" ${r.id === state.regulation ? 'selected' : ''}>${esc(r.name)}</option>`)
    .join('');
}

function renderRegulationNote() {
  const reg = currentReg();
  const dates = `${reg.start} → ${reg.end}`;
  $('#reg-note').textContent = reg.complete
    ? `${reg.name}: ${dates}.`
    : `${reg.name}: ${dates}. ${reg.note}`;
}

function renderSpeciesList() {
  $('#dl-species').innerHTML = allowedSpeciesNames()
    .map(n => `<option value="${esc(esName('species', n))}">`)
    .join('');
}

function renderItemList() {
  const reg = currentReg();
  const allowed = reg.items ? new Set(reg.items.map(norm)) : null;
  const names = Object.keys(state.itemMap).filter(n => !allowed || allowed.has(norm(n)));
  $('#dl-items').innerHTML = names.map(n => `<option value="${esc(esName('items', n))}">`).join('');
}

// ---------- Selector visual de Pokémon ----------

function openPicker(i) {
  pickIndex = i;
  $('#picker-search').value = '';
  renderPicker('');
  $('#picker-dialog').showModal();
  $('#picker-search').focus();
}

function renderPicker(query) {
  const term = norm(query);
  const names = allowedSpeciesNames().filter(n =>
    !term || norm(n).includes(term) || norm(esName('species', n)).includes(term));
  $('#picker-grid').innerHTML = names.length
    ? names.map(n => `
      <button type="button" class="picker-tile" data-name="${esc(n)}">
        <img loading="lazy" src="${esc(spriteUrl(state.speciesId[n]))}" alt="">
        <span>${esc(esName('species', n))}</span>
      </button>`).join('')
    : '<p class="muted">Sin resultados.</p>';
}

// ---------- Datos (PokeAPI) ----------

async function loadSpeciesIndex() {
  const j = await getJSON(`${API}/pokemon?limit=2000`);
  j.results.forEach(r => {
    const name = display(r.name);
    state.speciesMap[name] = r.name;
    state.speciesId[name] = +r.url.split('/').filter(Boolean).pop();
  });
  buildRev('species');
  renderSpeciesList();
}

async function loadItems() {
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const j = await getJSON(`${API}/item?limit=${pageSize}&offset=${offset}`);
    j.results.forEach(r => { state.itemMap[display(r.name)] = r.name; });
    buildRev('items');
    renderItemList();
    if (!j.next) break;
  }
}

async function itemIcon(name) {
  if (!name) return '';
  if (!(name in state.itemSprites)) {
    const slug = state.itemMap[name];
    if (!slug) return '';
    try {
      const j = await getJSON(`${API}/item/${slug}`);
      state.itemSprites[name] = j.sprites?.default || '';
    } catch {
      state.itemSprites[name] = '';
    }
  }
  return state.itemSprites[name];
}

async function refreshItemIcon(i) {
  const art = document.querySelector(`.slot[data-slot="${i}"]`);
  if (!art) return;
  const img = art.querySelector('.item-icon');
  const url = await itemIcon(state.team[i].item);
  img.src = url;
  img.hidden = !url;
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
    p.moves.forEach(m => { state.moveMap[display(m.move.name)] = m.move.name; });
    p.abilities.forEach(a => { state.abilityMap[display(a.ability.name)] = a.ability.name; });
    buildRev('moves');
    buildRev('abilities');
  }
  return state.details[slug];
}

// Estadísticas aproximadas: nivel 50, IV 31 (los EVs se pasan a /4 como en la serie principal).
function calcStats(base, evs, nature) {
  const out = {};
  const mod = NATURES[nature];
  for (const k of STAT_KEYS) {
    const b = base[k];
    const ev = Math.floor(pcToEv(evs[k] || 0) / 4);
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
  return m ? ` (+${STAT_ES[m[0]]} −${STAT_ES[m[1]]})` : '';
}

// ---------- Render ----------

function slotHTML(i, s) {
  const d = detailFor(s.species);
  const abilities = d ? d.abilities : (s.ability ? [s.ability] : []);
  const moveOpts = (d ? d.moves : []).map(m => `<option value="${esc(esName('moves', m))}">`).join('');
  const illegal = s.species && !isAllowedSpecies(s.species);
  const img = s.species && state.speciesId[s.species]
    ? spriteUrl(state.speciesId[s.species])
    : '';

  return `
  <article class="slot${illegal ? ' illegal' : ''}" data-slot="${i}">
    <div class="slot-head">
      <span class="num">${i + 1}</span>
      <button type="button" class="pick-btn" data-pick="${i}" title="Elegir Pokémon">
        ${img ? `<img src="${esc(img)}" alt="" width="56" height="56">` : '<span class="pick-empty">+</span>'}
      </button>
      <input class="species" data-f="species" list="dl-species" value="${esc(esName('species', s.species))}" placeholder="Pokémon">
    </div>
    ${illegal ? `<small class="warn">No está en ${esc(state.regulation)}</small>` : ''}
    <div class="item-row">
      <img class="item-icon" alt="" width="24" height="24" hidden>
      <label>Objeto
        <input data-f="item" list="dl-items" value="${esc(esName('items', s.item))}" placeholder="Objeto">
      </label>
    </div>
    <label>Habilidad
      <select data-f="ability">
        ${abilities.map(a => `<option value="${esc(a)}" ${a === s.ability ? 'selected' : ''}>${esc(esName('abilities', a))}</option>`).join('')}
      </select>
    </label>
    <label>Naturaleza
      <select data-f="nature">
        ${Object.keys(NATURES).map(n => `<option value="${n}" ${n === s.nature ? 'selected' : ''}>${esc(esName('natures', n))}${natureLabel(n)}</option>`).join('')}
      </select>
    </label>
    <div class="evs">
      ${STAT_KEYS.map(k => `
        <label>${STAT_ES[k]}
          <input type="number" min="0" max="${PC_MAX_STAT}" step="1" data-ev="${k}" value="${s.evs[k]}">
        </label>`).join('')}
      <span class="ev-total"></span>
    </div>
    <div class="moves">
      ${s.moves.map((m, j) => `
        <input data-move="${j}" list="moves-${i}" value="${esc(esName('moves', m))}" placeholder="Movimiento ${j + 1}">`).join('')}
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
    <div class="statline">${STAT_KEYS.map(k => `<span><b>${STAT_ES[k]}</b> ${st[k]}</span>`).join('')}</div>
    <small>Estimación: nivel 50, IV 31.</small>`;
}

function updateSlotMeta(i) {
  const art = document.querySelector(`.slot[data-slot="${i}"]`);
  if (!art) return;
  const s = state.team[i];
  const total = sumEV(s.evs);
  const t = art.querySelector('.ev-total');
  t.textContent = `PC: ${total}/${PC_MAX_TOTAL}`;
  t.classList.toggle('bad', total > PC_MAX_TOTAL);
  art.querySelector('.stats').innerHTML = statsHTML(s);
}

function renderSlot(i) {
  const tmp = document.createElement('div');
  tmp.innerHTML = slotHTML(i, state.team[i]);
  $('#slots').children[i].replaceWith(tmp.firstElementChild);
  updateSlotMeta(i);
  refreshItemIcon(i);
}

function renderSlots() {
  $('#slots').innerHTML = state.team.map((s, i) => slotHTML(i, s)).join('');
  state.team.forEach((_, i) => {
    updateSlotMeta(i);
    refreshItemIcon(i);
  });
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
        <span>${esc(n)} <small>(${esc(all[n].regulation)}, ${all[n].team.filter(s => s.species).length} Pokémon)</small></span>
        <span>
          <button type="button" data-act="load" data-name="${esc(n)}">Cargar</button>
          <button type="button" data-act="del" data-name="${esc(n)}">Borrar</button>
        </span>
      </li>`).join('')
    : '<li>No hay equipos guardados.</li>';
}

// ---------- Acciones ----------

async function preloadTeam(team) {
  await Promise.all(team.map(s => s.species
    ? loadDetail(s.species).catch(() => null)
    : null));
}

function refreshRegulationViews() {
  renderRegulationNote();
  renderSpeciesList();
  renderItemList();
  renderSlots();
  updateOutput();
}

function onRegulationChanged(id) {
  state.regulation = id;
  refreshRegulationViews();
  flash(`Regulación ${id}`);
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
  if (s.species && !isAllowedSpecies(s.species)) {
    flash(`${s.species} no está en ${state.regulation}`);
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
  all[name] = { regulation: state.regulation, team: structuredClone(state.team) };
  setSaved(all);
  renderTeamList();
  flash(`Guardado: ${name}`);
}

async function loadTeam(name) {
  const all = getSaved();
  const entry = all[name];
  if (!entry) return;
  state.regulation = REG.list.some(r => r.id === entry.regulation) ? entry.regulation : REG.current;
  renderRegulationSelect();
  state.team = structuredClone(entry.team);
  $('#team-name').value = name;
  await preloadTeam(state.team);
  refreshRegulationViews();
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

$('#slots').addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (b) openPicker(+b.dataset.pick);
});

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
    s.moves[+el.dataset.move] = fromEs('moves', el.value);
  } else if (el.dataset.f === 'item') {
    s.item = fromEs('items', el.value);
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
    await onSpeciesChanged(i, fromEs('species', e.target.value));
    return;
  }
  if (f === 'item') {
    s.item = fromEs('items', e.target.value);
    refreshItemIcon(i);
  }
  if (f === 'ability') s.ability = e.target.value;
  if (f === 'nature') {
    s.nature = e.target.value;
    updateSlotMeta(i);
  }
  updateOutput();
});

$('#picker-search').addEventListener('input', e => renderPicker(e.target.value));

$('#picker-grid').addEventListener('click', async e => {
  const tile = e.target.closest('.picker-tile');
  if (!tile) return;
  $('#picker-dialog').close();
  await onSpeciesChanged(pickIndex, tile.dataset.name);
});

$('#btn-picker-close').addEventListener('click', () => $('#picker-dialog').close());

$('#reg-select').addEventListener('change', e => onRegulationChanged(e.target.value));

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
  renderRegulationSelect();
  renderRegulationNote();
  renderSlots();
  updateOutput();
  renderTeamList();

  loadSpeciesIndex()
    .then(() => renderSlots())
    .catch(() => flash('No se pudo cargar la lista de Pokémon (PokeAPI)'));
  loadItems().catch(err => flash(`No se pudo cargar la lista de objetos: ${err.message}`));
}

init();
