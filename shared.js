export const EXT_ID = "com.cp2020.gm-statblocks";
export const META_KEY = `${EXT_ID}/statblock`;
const PRESETS_KEY = "cp2020_gm_presets_v1";
const LAYOUT_KEY = "cp2020_gm_layout_v1";
const ROLL_LOG_KEY = "cp2020_gm_rolllog_v1";

export const STAT_KEYS = ["ИНТ", "КРУТ", "ПЕР", "РЕФ", "ПРВЛ", "ТЕЛ", "ТЕХ", "УДАЧ", "ЭМП"];

export const CONCEAL_OPTIONS = ["Нет", "Карман", "Куртка", "Длинный плащ"];

export const SECTION_DEFS = [
  { id: "wounds", title: "Здоровье", defaultWide: false },
  { id: "armor", title: "Броня (SP)", defaultWide: false },
  { id: "weapons", title: "Оружие", defaultWide: true },
  { id: "stats", title: "Характеристики", defaultWide: false },
  { id: "notes", title: "Заметки / Наркотики / Эффекты", defaultWide: false },
  { id: "skills", title: "Навыки", defaultWide: false },
  { id: "gear", title: "Прочее снаряжение", defaultWide: false },
  { id: "cyberware", title: "Кибернетика", defaultWide: false },
  { id: "sdp", title: "SDP киберконечностей", defaultWide: false },
];

export const DEFAULT_SECTION_ORDER = SECTION_DEFS.map((s) => s.id);

export const ARMOR_ZONES = [
  { key: "TORSO", label: "ТОРС" },
  { key: "HEAD", label: "ГОЛОВА" },
  { key: "R_ARM", label: "ПРАВАЯ РУКА" },
  { key: "L_ARM", label: "ЛЕВАЯ РУКА" },
  { key: "R_LEG", label: "ПРАВАЯ НОГА" },
  { key: "L_LEG", label: "ЛЕВАЯ НОГА" },
];

export const CYBER_LIMBS = [
  { key: "R_ARM", label: "Правая рука" },
  { key: "L_ARM", label: "Левая рука" },
  { key: "R_LEG", label: "Правая нога" },
  { key: "L_LEG", label: "Левая нога" },
];

export const WOUND_TIERS = [
  { name: "LIGHT", min: 1, max: 4, stun: 0, badge: "badge-light", cls: "light", effect: "ОК, ОГЛ -0" },
  { name: "SERIOUS", min: 5, max: 8, stun: -1, badge: "badge-serious", cls: "serious", effect: "-2 к действиям РЕФ, ОГЛ -1" },
  { name: "CRITICAL", min: 9, max: 12, stun: -2, badge: "badge-critical", cls: "critical", effect: "РЕФ / ИНТ / КРУТ ÷ 2, ОГЛ -2" },
  { name: "MORTAL 0", min: 13, max: 16, stun: -3, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -3, Смерть 0" },
  { name: "MORTAL 1", min: 17, max: 20, stun: -4, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -4, Смерть -1" },
  { name: "MORTAL 2", min: 21, max: 24, stun: -5, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -5, Смерть -2" },
  { name: "MORTAL 3", min: 25, max: 28, stun: -6, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -6, Смерть -3" },
  { name: "MORTAL 4", min: 29, max: 32, stun: -7, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -7, Смерть -4" },
  { name: "MORTAL 5", min: 33, max: 36, stun: -8, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -8, Смерть -5" },
  { name: "MORTAL 6", min: 37, max: 40, stun: -9, badge: "badge-mortal", cls: "mortal", effect: "РЕФ / ИНТ / КРУТ ÷ 3, ОГЛ -9, Смерть -6" },
];

export const QUICK_EFFECT_TAGS = [
  "Blue Glass",
  "Smash",
  "Black Lace",
  "Speedheal",
  "Dorph",
  "Оглушён",
  "В укрытии",
  "Подавлен",
  "Горит",
];

export function getBasePath() {
  const path = window.location.pathname;
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx + 1) : "/";
}

export function toInt(val, fallback = 0) {
  if (typeof val === "number" && Number.isFinite(val)) return Math.trunc(val);
  if (typeof val === "string") {
    const m = val.match(/-?\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return fallback;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function normalizeConceal(val) {
  const s = String(val || "").trim().toLowerCase();
  if (!s || s === "нет" || s === "n" || s === "-") return "Нет";
  if (s.includes("карм") || s === "p") return "Карман";
  if (s.includes("курт") || s === "j") return "Куртка";
  if (s.includes("плащ") || s.includes("длин") || s === "l") return "Длинный плащ";
  return "Нет";
}

export function createEmptyWeapon(overrides = {}) {
  return {
    name: "Новое оружие",
    type: "",
    skill: "+4",
    wa: "+0",
    conceal: "Нет",
    damage: "2d6",
    ammoCur: 12,
    ammoMax: 12,
    rof: 2,
    rel: "ST",
    range: "50",
    notes: "",
    magazines: "",
    description: "",
    ...overrides,
  };
}

export function normalizeWeapon(w = {}) {
  return {
    name: String(w.name || "Оружие"),
    type: String(w.type || ""),
    skill: String(w.skill || ""),
    wa: String(w.wa ?? "+0"),
    conceal: normalizeConceal(w.conceal),
    damage: String(w.damage || "2d6"),
    ammoCur: Math.max(0, toInt(w.ammoCur, 0)),
    ammoMax: Math.max(0, toInt(w.ammoMax, 0)),
    rof: Math.max(1, toInt(w.rof, 1)),
    rel: String(w.rel || ""),
    range: String(w.range || ""),
    notes: String(w.notes || ""),
    magazines: String(w.magazines || ""),
    description: String(w.description || ""),
  };
}

export function calcWeaponRanges(rangeVal) {
  const str = String(rangeVal || "").trim().replace(",", ".");
  const m = str.match(/(\d+(?:\.\d+)?)/);
  if (!m) {
    return { valid: false, far: "-", close: "-", medium: "-", extreme: "-" };
  }
  const far = parseFloat(m[1]);
  if (!Number.isFinite(far) || far <= 0) {
    return { valid: false, far: "-", close: "-", medium: "-", extreme: "-" };
  }
  const fmt = (n) => `${Number(n.toFixed(1))} м`;
  return {
    valid: true,
    far: fmt(far),
    close: fmt(far / 4),
    medium: fmt(far / 2),
    extreme: fmt(far * 2),
  };
}

export function createEmptyStatblock(name = "Новый НПС") {
  return {
    version: 2,
    name,
    role: "",
    stats: {
      "ИНТ": 5, "КРУТ": 5, "ПЕР": 5,
      "РЕФ": 5, "ПРВЛ": 5, "ТЕЛ": 5,
      "ТЕХ": 5, "УДАЧ": 5, "ЭМП": 5,
    },
    derivedOverride: { enabled: false, btm: null, dmgBonus: null, run: null },
    combatSkills: "",
    otherSkills: "",
    cyberware: "",
    armor: {
      TORSO: { cur: 0, max: 0 },
      HEAD: { cur: 0, max: 0 },
      R_ARM: { cur: 0, max: 0 },
      L_ARM: { cur: 0, max: 0 },
      R_LEG: { cur: 0, max: 0 },
      L_LEG: { cur: 0, max: 0 },
    },
    weapons: [],
    gear: "",
    wounds: 0,
    cyberlimbs: {
      R_ARM: { cur: 0, max: 0 },
      L_ARM: { cur: 0, max: 0 },
      R_LEG: { cur: 0, max: 0 },
      L_LEG: { cur: 0, max: 0 },
    },
    notes: "",
    hiddenSections: [],
  };
}

export function normalizeStatblock(raw, fallbackName = "НПС") {
  const base = createEmptyStatblock(fallbackName);
  if (!raw || typeof raw !== "object") return base;
  const out = {
    ...base,
    ...raw,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : fallbackName,
    stats: { ...base.stats, ...(raw.stats || {}) },
    derivedOverride: { ...base.derivedOverride, ...(raw.derivedOverride || {}) },
    armor: { ...base.armor },
    cyberlimbs: { ...base.cyberlimbs },
    weapons: Array.isArray(raw.weapons) ? raw.weapons.map(normalizeWeapon) : [],
    wounds: clamp(toInt(raw.wounds, 0), 0, 40),
    hiddenSections: Array.isArray(raw.hiddenSections)
      ? raw.hiddenSections.filter((id) => DEFAULT_SECTION_ORDER.includes(id))
      : [],
  };

  for (const k of STAT_KEYS) {
    out.stats[k] = clamp(toInt(out.stats[k], 5), 1, 30);
  }
  for (const z of ARMOR_ZONES) {
    const src = raw.armor?.[z.key] || {};
    const max = Math.max(0, toInt(src.max, 0));
    const cur = clamp(toInt(src.cur, max), 0, Math.max(max, toInt(src.cur, 0)));
    out.armor[z.key] = { cur, max };
  }
  for (const l of CYBER_LIMBS) {
    const src = raw.cyberlimbs?.[l.key] || {};
    const max = Math.max(0, toInt(src.max, 0));
    const cur = clamp(toInt(src.cur, max), 0, Math.max(max, toInt(src.cur, 0)));
    out.cyberlimbs[l.key] = { cur, max };
  }
  return out;
}

export function calcDerived(sb) {
  const body = toInt(sb.stats["ТЕЛ"], 5);
  const ma = toInt(sb.stats["ПЕР"], 5);

  let autoBtm = 0;
  if (body <= 2) autoBtm = 0;
  else if (body <= 4) autoBtm = -1;
  else if (body <= 7) autoBtm = -2;
  else if (body <= 9) autoBtm = -3;
  else if (body === 10) autoBtm = -4;
  else autoBtm = -5;

  let autoDmg = 0;
  if (body <= 2) autoDmg = -2;
  else if (body <= 4) autoDmg = -1;
  else if (body <= 7) autoDmg = 0;
  else if (body <= 9) autoDmg = 1;
  else if (body === 10) autoDmg = 2;
  else if (body <= 12) autoDmg = 4;
  else if (body <= 14) autoDmg = 6;
  else autoDmg = 8;

  const autoRun = ma * 3;
  const ov = sb.derivedOverride || {};
  const btm = ov.enabled && ov.btm !== null && ov.btm !== "" ? toInt(ov.btm, autoBtm) : autoBtm;
  const dmgBonus = ov.enabled && ov.dmgBonus !== null && ov.dmgBonus !== "" ? toInt(ov.dmgBonus, autoDmg) : autoDmg;
  const run = ov.enabled && ov.run !== null && ov.run !== "" ? toInt(ov.run, autoRun) : autoRun;

  const w = clamp(toInt(sb.wounds, 0), 0, 40);
  let tier = null;
  if (w > 0) {
    tier = WOUND_TIERS.find((t) => w >= t.min && w <= t.max) || WOUND_TIERS[WOUND_TIERS.length - 1];
  }

  const effStats = { ...sb.stats };
  const penalizedKeys = new Set();
  const severeKeys = new Set();

  if (tier) {
    if (tier.name === "SERIOUS") {
      effStats["РЕФ"] = Math.max(1, sb.stats["РЕФ"] - 2);
      penalizedKeys.add("РЕФ");
    } else if (tier.name === "CRITICAL") {
      for (const k of ["РЕФ", "ИНТ", "КРУТ"]) {
        effStats[k] = Math.max(1, Math.ceil(sb.stats[k] / 2));
        penalizedKeys.add(k);
        severeKeys.add(k);
      }
    } else if (tier.name.startsWith("MORTAL")) {
      for (const k of ["РЕФ", "ИНТ", "КРУТ"]) {
        effStats[k] = Math.max(1, Math.ceil(sb.stats[k] / 3));
        penalizedKeys.add(k);
        severeKeys.add(k);
      }
    }
  }

  const stunPenalty = tier ? tier.stun : 0;
  const mortalLevel = tier && tier.name.startsWith("MORTAL") ? parseInt(tier.name.split(" ")[1], 10) : null;
  const stunTarget = Math.max(0, body + stunPenalty);
  const deathTarget = mortalLevel !== null ? Math.max(0, body - mortalLevel) : null;

  return {
    btm,
    dmgBonus,
    dmgBonusText: dmgBonus > 0 ? `+${dmgBonus}` : `${dmgBonus}`,
    run,
    wounds: w,
    tier,
    tierName: tier ? tier.name : "ЗДОРОВ",
    tierBadge: tier ? tier.badge : "badge-ok",
    tierEffect: tier ? tier.effect : "Без штрафов, ОГЛ -0",
    stunPenalty,
    stunTarget,
    mortalLevel,
    deathTarget,
    effStats,
    penalizedKeys,
    severeKeys,
  };
}

export function getCyberlimbStatus(limb) {
  if (!limb || limb.max <= 0) return { label: "Нет", cls: "muted" };
  if (limb.cur <= 0) return { label: "УНИЧТОЖЕНА", cls: "badge badge-mortal" };
  if (limb.cur <= 10) return { label: "ОТКАЗ (<=10)", cls: "badge badge-serious" };
  return { label: "ОК", cls: "badge badge-ok" };
}

/* ---------- Dice Roller ---------- */
export function rollD10(exploding = true) {
  const first = Math.floor(Math.random() * 10) + 1;
  const rolls = [first];
  if (exploding && first === 10) {
    let safety = 0;
    while (safety < 10) {
      const next = Math.floor(Math.random() * 10) + 1;
      rolls.push(next);
      if (next !== 10) break;
      safety++;
    }
  }
  return { first, rolls, total: rolls.reduce((a, b) => a + b, 0), isTen: first === 10, isOne: first === 1 };
}

export function rollDicePool(count, sides, exploding = false) {
  const n = clamp(toInt(count, 1), 1, 30);
  const groups = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (sides === 10 && exploding) {
      const r = rollD10(true);
      groups.push(r.rolls.length > 1 ? `(${r.rolls.join("+")})` : `${r.total}`);
      total += r.total;
    } else {
      const val = Math.floor(Math.random() * sides) + 1;
      groups.push(`${val}`);
      total += val;
    }
  }
  return { count: n, sides, groups, total };
}

export function rollFormula(formulaStr) {
  const raw = String(formulaStr || "1d6").trim();
  const m = raw.match(/(\d+)\s*[dдк]\s*(\d+)\s*([+-]\s*\d+)?\s*(\/\s*2)?/i);
  if (!m) {
    const flat = toInt(raw, 0);
    return { valid: false, total: flat, text: `${raw} = ${flat}` };
  }
  const count = clamp(parseInt(m[1], 10), 1, 30);
  const sides = clamp(parseInt(m[2], 10), 2, 100);
  const mod = m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0;
  const half = Boolean(m[4]);
  const dice = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    dice.push(r);
    sum += r;
  }
  let total = sum + mod;
  if (half) total = Math.floor(total / 2);
  const modPart = mod !== 0 ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : "";
  const halfPart = half ? " ÷ 2" : "";
  return { valid: true, total, text: `${count}d${sides}[${dice.join(", ")}]${modPart}${halfPart} = ${total}` };
}

/* ---------- Layout & Roll Log Storage ---------- */
let memLayout = {
  order: [...DEFAULT_SECTION_ORDER],
  wideIds: ["weapons"],
  locked: true,
  popoverWidth: 740,
  popoverHeight: 740,
  modalMode: "M",
};

export function loadLayoutPrefs() {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { ...memLayout, order: [...memLayout.order], wideIds: [...memLayout.wideIds] };
    const parsed = JSON.parse(raw);
    const validOrder = Array.isArray(parsed.order)
      ? parsed.order.filter((id) => DEFAULT_SECTION_ORDER.includes(id))
      : [];
    for (const id of DEFAULT_SECTION_ORDER) {
      if (!validOrder.includes(id)) validOrder.push(id);
    }
    return {
      order: validOrder,
      wideIds: Array.isArray(parsed.wideIds) ? parsed.wideIds : ["weapons"],
      locked: typeof parsed.locked === "boolean" ? parsed.locked : true,
      popoverWidth: clamp(toInt(parsed.popoverWidth, 740), 380, 1400),
      popoverHeight: clamp(toInt(parsed.popoverHeight, 740), 420, 1000),
      modalMode: ["S", "M", "L", "FULL"].includes(parsed.modalMode) ? parsed.modalMode : "M",
    };
  } catch {
    return { ...memLayout, order: [...memLayout.order], wideIds: [...memLayout.wideIds] };
  }
}

export function saveLayoutPrefs(patch) {
  const cur = loadLayoutPrefs();
  const next = { ...cur, ...patch };
  memLayout = next;
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

let memRollLog = [];
export function loadRollHistory() {
  try {
    const raw = window.localStorage.getItem(ROLL_LOG_KEY);
    if (!raw) return [...memRollLog];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [...memRollLog];
  }
}

export function saveRollHistory(entries) {
  memRollLog = entries.slice(0, 40);
  try {
    window.localStorage.setItem(ROLL_LOG_KEY, JSON.stringify(memRollLog));
  } catch {
    // ignore
  }
}

/* ---------- Markdown Parser & Exporter ---------- */
export function parseMarkdownStatblock(mdText, fallbackName = "Импорт НПС") {
  const sb = createEmptyStatblock(fallbackName);
  const lines = String(mdText || "").replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    const h = line.match(/^#{1,2}\s+(.+)$/);
    if (h) {
      const title = h[1].trim();
      if (!/^(ХАРАКТЕРИСТИКИ|НАВЫКИ|КИБЕРНЕТИКА|ЗАЩИТА|ЗДОРОВЬЕ|SDP)/i.test(title)) {
        sb.name = title;
      }
      break;
    }
  }

  let section = "";
  let subSection = "";
  const skillExtra = [];
  const cyberLines = [];
  const gearLines = [];
  let currentWeapon = null;
  let overrideBtm = null;
  let overrideDmg = null;
  let overrideRun = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    const hMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (hMatch) {
      const title = hMatch[1].toUpperCase();
      subSection = "";
      if (title.includes("ХАРАКТЕРИСТИК")) section = "STATS";
      else if (title.includes("НАВЫК")) section = "SKILLS";
      else if (title.includes("КИБЕРНЕТИК") && !title.includes("SDP")) section = "CYBER";
      else if (title.includes("ЗАЩИТ") || title.includes("СНАРЯЖЕНИ")) section = "DEFENSE";
      else if (title.includes("ЗДОРОВЬ")) section = "HEALTH";
      else if (title.includes("SDP")) section = "SDP";
      continue;
    }

    if (/^\*\*Производные показатели/i.test(line)) { subSection = "DERIVED"; continue; }
    if (/^\*\*Способность роли/i.test(line)) { subSection = "ROLE"; continue; }
    if (/^\*\*БРОНЯ/i.test(line)) { subSection = "ARMOR"; continue; }
    if (/^\*\*ОРУЖИЕ/i.test(line)) { subSection = "WEAPONS"; continue; }
    if (/^\*\*ПРОЧЕЕ СНАРЯЖЕНИЕ/i.test(line)) { subSection = "GEAR"; continue; }

    if (/^\|[\s:-]+\|/.test(line)) continue;
    const tableMatch = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|\n]+?)\s*\|?\s*$/);

    if (section === "STATS") {
      if (tableMatch) {
        const key = tableMatch[1].trim().toUpperCase();
        const val = tableMatch[2].trim();
        if (STAT_KEYS.includes(key) && /\d/.test(val)) {
          sb.stats[key] = toInt(val, sb.stats[key]);
        }
        continue;
      }
      if (subSection === "DERIVED") {
        const mBtm = line.match(/МТЕЛ\s*:\s*([+-]?\d+)/i);
        const mDmg = line.match(/УРбонус\s*:\s*([+-]?\d+)/i);
        const mRun = line.match(/БЕГ\s*:\s*(\d+)/i);
        if (mBtm) overrideBtm = parseInt(mBtm[1], 10);
        if (mDmg) overrideDmg = parseInt(mDmg[1], 10);
        if (mRun) overrideRun = parseInt(mRun[1], 10);
      }
    } else if (section === "SKILLS") {
      const mRole = line.match(/Роль\s*:\s*(.+)$/i);
      const mCombat = line.match(/Боевые навыки\s*:\s*(.+)$/i);
      const mOther = line.match(/Прочее\s*:\s*(.+)$/i);
      if (mRole) {
        const val = mRole[1].trim();
        if (val && val !== "?") sb.role = val;
      } else if (mCombat) {
        const val = mCombat[1].trim();
        if (val && val !== "+?" && val !== "?") sb.combatSkills = val;
      } else if (mOther) {
        const val = mOther[1].trim();
        if (val && val !== "+?" && val !== "?") sb.otherSkills = val;
      } else if (!/^\*\*/.test(line)) {
        skillExtra.push(line.replace(/^[-*]\s*/, ""));
      }
    } else if (section === "CYBER") {
      if (!/При отсутствии кибернетики/i.test(line)) {
        cyberLines.push(line.replace(/^[-*]\s*/, ""));
      }
    } else if (section === "DEFENSE") {
      if (subSection === "ARMOR" && tableMatch) {
        const loc = tableMatch[1].trim().toUpperCase();
        const val = tableMatch[2].trim();
        const zone = ARMOR_ZONES.find((z) => loc.includes(z.label));
        if (zone) {
          const pair = val.match(/(\d+)\s*\/\s*(\d+)/);
          if (pair) sb.armor[zone.key] = { cur: parseInt(pair[1], 10), max: parseInt(pair[2], 10) };
          else if (/\d+/.test(val)) {
            const num = toInt(val, 0);
            sb.armor[zone.key] = { cur: num, max: num };
          }
        }
      } else if (subSection === "WEAPONS") {
        const wHead = rawLine.match(/^\s*[-*]\s*\*\*(.+?)\*\*\s*(.*)$/);
        if (wHead && !/^(Тип|Навык|WA|ТО|Скрыт|Урон|ROF|СКО|НАД|Боезапас|#|Дальность|Дистанция|Особенности|Примечания|Зарядники|Описание)\s*:/i.test(wHead[1])) {
          let wName = wHead[1].replace(/:$/, "").trim();
          const tail = wHead[2].replace(/^:\s*/, "").trim();
          if (wName === "Название" && tail) wName = tail;
          currentWeapon = createEmptyWeapon({ name: wName || "Оружие", ammoCur: 0, ammoMax: 0, rof: 1, range: "" });
          sb.weapons.push(currentWeapon);
        } else if (currentWeapon) {
          const clean = line.replace(/^[-*]\s*/, "");
          const kv = clean.match(/^([^:]+):\s*(.*)$/);
          if (kv) {
            const k = kv[1].trim().toLowerCase();
            const v = kv[2].trim();
            if (k === "тип") currentWeapon.type = v;
            else if (k.includes("навык")) currentWeapon.skill = v;
            else if (k === "wa" || k === "то") currentWeapon.wa = v || "0";
            else if (k.includes("скрыт")) currentWeapon.conceal = normalizeConceal(v);
            else if (k.includes("урон")) currentWeapon.damage = v || "2d6";
            else if (k === "rof" || k === "ско") currentWeapon.rof = Math.max(1, toInt(v, 1));
            else if (k === "над") currentWeapon.rel = v;
            else if (k.includes("боезапас") || k === "#") {
              const pair = v.match(/(\d+)\s*\/\s*(\d+)/);
              if (pair) {
                currentWeapon.ammoCur = parseInt(pair[1], 10);
                currentWeapon.ammoMax = parseInt(pair[2], 10);
              } else if (/\d+/.test(v)) {
                const n = toInt(v, 0);
                currentWeapon.ammoCur = n;
                currentWeapon.ammoMax = n;
              }
            } else if (k.includes("дальност") || k.includes("дистанц")) currentWeapon.range = v;
            else if (k.includes("особенност") || k.includes("примечан")) currentWeapon.notes = v;
            else if (k.includes("зарядник")) currentWeapon.magazines = v;
            else if (k.includes("описан")) currentWeapon.description = v;
          }
        }
      } else if (subSection === "GEAR") {
        const clean = line.replace(/^[-*]\s*/, "").trim();
        if (clean) gearLines.push(clean);
      }
    } else if (section === "SDP" && tableMatch) {
      const loc = tableMatch[1].trim().toLowerCase();
      const val = tableMatch[2].trim();
      const limb = CYBER_LIMBS.find((l) => loc.includes(l.label.toLowerCase()));
      if (limb) {
        const pair = val.match(/(\d+)\s*\/\s*(\d+)/);
        if (pair) sb.cyberlimbs[limb.key] = { cur: parseInt(pair[1], 10), max: parseInt(pair[2], 10) };
      }
    }
  }

  if (skillExtra.length) sb.otherSkills = [sb.otherSkills, ...skillExtra].filter(Boolean).join("\n");
  if (cyberLines.length) sb.cyberware = cyberLines.join("\n");
  if (gearLines.length) sb.gear = gearLines.join("\n");

  const auto = calcDerived(sb);
  if (
    (overrideBtm !== null && overrideBtm !== auto.btm) ||
    (overrideDmg !== null && overrideDmg !== auto.dmgBonus) ||
    (overrideRun !== null && overrideRun !== auto.run)
  ) {
    sb.derivedOverride = {
      enabled: true,
      btm: overrideBtm ?? auto.btm,
      dmgBonus: overrideDmg ?? auto.dmgBonus,
      run: overrideRun ?? auto.run,
    };
  }

  return normalizeStatblock(sb, sb.name);
}

export function exportMarkdownStatblock(sb) {
  const d = calcDerived(sb);
  const armorRows = ARMOR_ZONES.map((z) => `| ${z.label} | ${sb.armor[z.key].cur} / ${sb.armor[z.key].max} |`).join("\n");
  const weaponsText = sb.weapons.length
    ? sb.weapons
        .map(
          (w) =>
            `- **${w.name}:**\n` +
            `  - Тип: ${w.type || "-"}\n` +
            `  - Навык: ${w.skill || "-"}\n` +
            `  - ТО: ${w.wa || "0"}\n` +
            `  - Скрыт: ${w.conceal || "Нет"}\n` +
            `  - Урон: ${w.damage || "-"}\n` +
            `  - Боезапас: ${w.ammoCur} / ${w.ammoMax}\n` +
            `  - СКО: ${w.rof}\n` +
            `  - НАД: ${w.rel || "-"}\n` +
            `  - Дистанция: ${w.range || "-"}\n` +
            `  - Примечания: ${w.notes || "-"}\n` +
            `  - Зарядники: ${w.magazines || "-"}\n` +
            `  - Описание: ${w.description || "-"}`
        )
        .join("\n")
    : "- Нет";

  const gearLines = (sb.gear || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const gearText = gearLines.length ? gearLines.map((g) => `- ${g}`).join("\n") : "-";
  const limbRows = CYBER_LIMBS.map((l) => {
    const v = sb.cyberlimbs[l.key];
    return `| ${l.label} | ${v.max > 0 ? `${v.cur} / ${v.max}` : "? / ?"} |`;
  }).join("\n");

  return `# ${sb.name}

## ХАРАКТЕРИСТИКИ
| Характеристика | Значение |
|---|---:|
${STAT_KEYS.map((k) => `| ${k} | ${sb.stats[k]} |`).join("\n")}

**Производные показатели:**
- МТЕЛ: ${d.btm}
- УРбонус: ${d.dmgBonusText}
- БЕГ: ${d.run} м

## НАВЫКИ
**Способность роли:**
- Роль: ${sb.role || "?"}
- Боевые навыки: ${sb.combatSkills || "+?"}
- Прочее: ${sb.otherSkills || "+?"}

## КИБЕРНЕТИКА
${sb.cyberware?.trim() || "*При отсутствии кибернетики раздел пропускается.*"}

## ЗАЩИТА И СНАРЯЖЕНИЕ
**БРОНЯ (SP):**
| Часть тела | Текущий SP / Максимальный SP |
|---|---:|
${armorRows}

**ОРУЖИЕ:**
${weaponsText}

**ПРОЧЕЕ СНАРЯЖЕНИЕ:**
${gearText}

## ЗДОРОВЬЕ
Текущие ранения: ${d.wounds} / 40 (${d.tierName} — ${d.tierEffect})

## SDP КИБЕРНЕТИЧЕСКИХ КОНЕЧНОСТЕЙ
| Конечность | SDP (текущий / максимум) |
|---|---:|
${limbRows}
`;
}

/* ---------- Presets ---------- */
export const BUILTIN_PRESETS = [
  {
    id: "builtin_booster",
    name: "Уличный бустер (Панк)",
    statblock: normalizeStatblock({
      name: "Уличный бустер",
      role: "Панк / Гангер",
      stats: { "ИНТ": 4, "КРУТ": 6, "ПЕР": 6, "РЕФ": 6, "ПРВЛ": 4, "ТЕЛ": 6, "ТЕХ": 4, "УДАЧ": 5, "ЭМП": 4 },
      combatSkills: "Пистолеты +4, Драка +4, Холодное оружие +3, Уклонение +3",
      otherSkills: "Уличная этика +4, Запугивание +3, Вождение +2",
      cyberware: "Киберглаз (инфравизор), Потрошители (Rippers, 2d6 в ближнем бою)",
      armor: {
        TORSO: { cur: 14, max: 14 }, HEAD: { cur: 0, max: 0 },
        R_ARM: { cur: 10, max: 10 }, L_ARM: { cur: 10, max: 10 },
        R_LEG: { cur: 4, max: 4 }, L_LEG: { cur: 4, max: 4 },
      },
      weapons: [
        createEmptyWeapon({
          name: "Sternmeyer Type 35",
          type: "П (Тяж)",
          skill: "+4",
          wa: "+0",
          conceal: "Куртка",
          damage: "3d6",
          ammoCur: 8,
          ammoMax: 8,
          rof: 2,
          rel: "VR",
          range: "50",
          notes: "Бронежилет + кожаная куртка",
          magazines: "2 запасных",
          description: "Надёжный тяжёлый уличный пистолет 11мм.",
        }),
      ],
      gear: "Доза Smash, рация, нож",
      notes: "Агрессивный, при SERIOUS может попытаться отступить.",
    }),
  },
  {
    id: "builtin_corpsec",
    name: "Корпоративный охранник",
    statblock: normalizeStatblock({
      name: "Охранник Арасаки",
      role: "Охрана (Соло-поддержка)",
      stats: { "ИНТ": 5, "КРУТ": 6, "ПЕР": 6, "РЕФ": 7, "ПРВЛ": 5, "ТЕЛ": 7, "ТЕХ": 5, "УДАЧ": 5, "ЭМП": 5 },
      combatSkills: "ПП +5, Винтовки +4, Атлетика +3, Внимание +5",
      otherSkills: "Тактика +3, Связь +3, Первая помощь +2",
      cyberware: "Смартлинк, Нейропроцессор, Наушник-радио",
      armor: {
        TORSO: { cur: 18, max: 18 }, HEAD: { cur: 14, max: 14 },
        R_ARM: { cur: 14, max: 14 }, L_ARM: { cur: 14, max: 14 },
        R_LEG: { cur: 14, max: 14 }, L_LEG: { cur: 14, max: 14 },
      },
      weapons: [
        createEmptyWeapon({
          name: "Arasaka Minami 10",
          type: "ПП (Сред)",
          skill: "+5",
          wa: "+0",
          conceal: "Длинный плащ",
          damage: "2d6+1",
          ammoCur: 40,
          ammoMax: 40,
          rof: 20,
          rel: "VR",
          range: "150",
          notes: "Смартган (+2 со смартлинком)",
          magazines: "2 полных (40)",
          description: "Штатный ПП службы безопасности Арасаки.",
        }),
      ],
      gear: "Наручники, тактический фонарь",
    }),
  },
  {
    id: "builtin_solo",
    name: "Опытный Соло / Наёмник",
    statblock: normalizeStatblock({
      name: "Элитный Соло",
      role: "Соло (Боевая интуиция +6)",
      stats: { "ИНТ": 7, "КРУТ": 8, "ПЕР": 7, "РЕФ": 9, "ПРВЛ": 6, "ТЕЛ": 8, "ТЕХ": 6, "УДАЧ": 6, "ЭМП": 4 },
      combatSkills: "Винтовки +7, Пистолеты +6, Боевые искусства +5, Уклонение +6",
      otherSkills: "Осведомлённость +6, Скрытность +5, Взлом +3",
      cyberware: "Керензиков (+2 Иниц.), Смартлинк, Подкожная броня, Правая киберрука",
      armor: {
        TORSO: { cur: 20, max: 20 }, HEAD: { cur: 18, max: 18 },
        R_ARM: { cur: 18, max: 18 }, L_ARM: { cur: 18, max: 18 },
        R_LEG: { cur: 18, max: 18 }, L_LEG: { cur: 18, max: 18 },
      },
      weapons: [
        createEmptyWeapon({
          name: "Militech Ronin",
          type: "ВИН",
          skill: "+7",
          wa: "+1",
          conceal: "Нет",
          damage: "5d6",
          ammoCur: 35,
          ammoMax: 35,
          rof: 30,
          rel: "VR",
          range: "400",
          notes: "Смартган, ББ-патроны",
          magazines: "3 магазина (35)",
          description: "Лёгкая штурмовая винтовка 5.56мм.",
        }),
      ],
      cyberlimbs: {
        R_ARM: { cur: 25, max: 25 },
        L_ARM: { cur: 0, max: 0 },
        R_LEG: { cur: 0, max: 0 },
        L_LEG: { cur: 0, max: 0 },
      },
      gear: "Speedheal x2, дымовая граната x2, шифрованная связь",
    }),
  },
];

let memPresets = [];
export function loadSavedPresets() {
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    if (!raw) return [...memPresets];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...memPresets];
  }
}

export function savePresetToStorage(name, statblock) {
  const list = loadSavedPresets();
  const entry = {
    id: `user_${Date.now()}`,
    name: name.trim() || statblock.name || "Шаблон НПС",
    statblock: normalizeStatblock(statblock, name),
  };
  list.unshift(entry);
  memPresets = list;
  try {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  return entry;
}

export function deleteSavedPreset(id) {
  const list = loadSavedPresets().filter((p) => p.id !== id);
  memPresets = list;
  try {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}