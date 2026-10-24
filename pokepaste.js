// Formato Pokepaste / Showdown: generar y leer equipos.

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

// Pokémon Champions usa puntos de estadística (PC, máx. 32 por stat y 66 en total).
// En el Pokepaste la línea "EVs:" ya muestra PC, así que se exportan e importan tal cual.
// Para calcular estadísticas: el primer PC equivale a 4 EVs y cada PC adicional a 8.
function pcToEv(n) { return n > 0 ? 4 + 8 * (n - 1) : 0; }

function emptySet() {
  return {
    species: '',
    name: '',
    item: '',
    ability: '',
    level: 50,
    nature: 'Hardy',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: ['', '', '', ''],
  };
}

// Set -> texto Pokepaste
function toPaste(set) {
  const lines = [];
  const head = set.name && set.name !== set.species
    ? `${set.name} (${set.species})`
    : set.species;
  lines.push(set.item ? `${head} @ ${set.item}` : head);

  if (set.ability) lines.push(`Ability: ${set.ability}`);
  if (set.level && set.level !== 50) lines.push(`Level: ${set.level}`);

  const evs = STAT_KEYS.filter(k => set.evs[k] > 0).map(k => `${set.evs[k]} ${STAT_LABELS[k]}`);
  if (evs.length) lines.push(`EVs: ${evs.join(' / ')}`);

  if (set.nature) lines.push(`${set.nature} Nature`);
  set.moves.filter(Boolean).forEach(m => lines.push(`- ${m}`));

  return lines.join('\n');
}

// Texto Pokepaste -> array de sets
function parsePaste(text) {
  return text
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map(parseBlock)
    .filter(s => s.species);
}

function parseBlock(block) {
  const set = emptySet();
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const first = (lines.shift() || '').replace(/\s*\((M|F)\)\s*$/, '');

  const [left, item = ''] = first.split(' @ ');
  set.item = item.trim();

  const m = left.match(/^(.+?)\s*\((.+)\)$/);
  if (m) {
    set.name = m[1].trim();
    set.species = m[2].trim();
  } else {
    set.species = left.trim();
    set.name = set.species;
  }

  const moves = [];
  for (const line of lines) {
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).trim());
    } else if (/^Ability:/i.test(line)) {
      set.ability = line.replace(/^Ability:\s*/i, '');
    } else if (/^Level:/i.test(line)) {
      set.level = parseInt(line.split(':')[1], 10) || 50;
    } else if (/^EVs:/i.test(line)) {
      for (const [, v, k] of line.matchAll(/(\d+)\s*(HP|Atk|Def|SpA|SpD|Spe)/gi)) {
        set.evs[k.toLowerCase()] = Math.min(32, parseInt(v, 10));
      }
    } else if (/ Nature$/i.test(line)) {
      set.nature = line.replace(/ Nature$/i, '');
    }
    // IVs, Tera Type, Shiny, etc. se ignoran de momento.
  }

  set.moves = [...moves.slice(0, 4), ...Array(4).fill('')].slice(0, 4);
  return set;
}
