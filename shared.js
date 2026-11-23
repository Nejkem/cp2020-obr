export const EXT_ID = "com.cp2020.gm-statblocks";
export const META_KEY = `${EXT_ID}/statblock`;
const PRESETS_KEY = "cp2020_gm_presets_v1";

export const STAT_KEYS = [
  "ИНТ",
  "КРУТ",
  "ПЕР",
  "РЕФ",
  "ПРВЛ",
  "ТЕЛ",
  "ТЕХ",
  "УДАЧ",
  "ЭМП",
];

export const ARMOR_ZONES = [
  { key: "TORSO", label: "ТОРС", short: "Торс" },
  { key: "HEAD", label: "ГОЛОВА", short: "Голова" },
  { key: "R_ARM", label: "ПРАВАЯ РУКА", short: "П. рука" },
  { key: "L_ARM", label: "ЛЕВАЯ РУКА", short: "Л. рука" },
  { key: "R_LEG", label: "ПРАВАЯ НОГА", short: "П. нога" },
  { key: "L_LEG", label: "ЛЕВАЯ НОГА", short: "Л. нога" },
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

export function createEmptyStatblock(name = "Новый НПС") {
  return {
    version: 1,
    name,
    role: "",
    roleAbility: "",
    stats: {
      "ИНТ": 5,
      "КРУТ": 5,
      "ПЕР": 5,
      "РЕФ": 5,
      "ПРВЛ": 5,
      "ТЕЛ": 5,
      "ТЕХ": 5,
      "УДАЧ": 5,
      "ЭМП": 5,
    },
    derivedOverride: {
      enabled: false,
      btm: null,
      dmgBonus: null,
      run: null,
    },
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
    weapons: Array.isArray(raw.weapons)
      ? raw.weapons.map((w) => ({
          name: String(w?.name || "Оружие"),
          skill: String(w?.skill || ""),
          wa: String(w?.wa || "0"),
          damage: String(w?.damage || "2d6"),
          rof: Math.max(1, toInt(w?.rof, 1)),
          ammoCur: Math.max(0, toInt(w?.ammoCur, 0)),
          ammoMax: Math.max(0, toInt(w?.ammoMax, 0)),
          range: String(w?.range || ""),
          notes: String(w?.notes || ""),
        }))
      : [],
    wounds: clamp(toInt(raw.wounds, 0), 0, 40),
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

  // Wounds & Penalties
  const w = clamp(toInt(sb.wounds, 0), 0, 40);
  let tier = null;
  let tierIndex = -1;
  if (w > 0) {
    tierIndex = WOUND_TIERS.findIndex((t) => w >= t.min && w <= t.max);
    tier = WOUND_TIERS[tierIndex] || WOUND_TIERS[WOUND_TIERS.length - 1];
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
    tierIndex,
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
  const total = rolls.reduce((a, b) => a + b, 0);
  return { first, rolls, total, isTen: first === 10, isOne: first === 1 };
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
  return {
    valid: true,
    total,
    text: `${count}d${sides}[${dice.join(", ")}]${modPart}${halfPart} = ${total}`,
  };
}

/* ---------- Markdown Parser & Exporter ---------- */
export function parseMarkdownStatblock(mdText, fallbackName = "Импорт НПС") {
  const sb = createEmptyStatblock(fallbackName);
  const lines = String(mdText || "").replace(/\r\n/g, "\n").split("\n");

  // Detect optional title on first heading if not ХАРАКТЕРИСТИКИ
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

    // Section headers
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

    // Subheaders inside sections
    if (/^\*\*Производные показатели/i.test(line)) { subSection = "DERIVED"; continue; }
    if (/^\*\*Способность роли/i.test(line)) { subSection = "ROLE"; continue; }
    if (/^\*\*БРОНЯ/i.test(line)) { subSection = "ARMOR"; continue; }
    if (/^\*\*ОРУЖИЕ/i.test(line)) { subSection = "WEAPONS"; continue; }
    if (/^\*\*ПРОЧЕЕ СНАРЯЖЕНИЕ/i.test(line)) { subSection = "GEAR"; continue; }

    // Skip markdown table separators
    if (/^\|[\s:-]+\|/.test(line)) continue;

    // Table row parser: | Key | Val |
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
          if (pair) {
            sb.armor[zone.key] = { cur: parseInt(pair[1], 10), max: parseInt(pair[2], 10) };
          } else if (/\d+/.test(val)) {
            const num = toInt(val, 0);
            sb.armor[zone.key] = { cur: num, max: num };
          }
        }
      } else if (subSection === "WEAPONS") {
        // Weapon header: - **Название:** ... or - **Название**
        const wHead = rawLine.match(/^\s*[-*]\s*\*\*(.+?)\*\*\s*(.*)$/);
        if (wHead && !/^(Навык|WA|Урон|ROF|Боезапас|Дальность|Особенности)\s*:/i.test(wHead[1])) {
          let wName = wHead[1].replace(/:$/, "").trim();
          const tail = wHead[2].replace(/^:\s*/, "").trim();
          if (wName === "Название" && tail) wName = tail;
          currentWeapon = {
            name: wName || "Оружие",
            skill: "",
            wa: "0",
            damage: "2d6",
            rof: 1,
            ammoCur: 0,
            ammoMax: 0,
            range: "",
            notes: "",
          };
          sb.weapons.push(currentWeapon);
        } else if (currentWeapon) {
          const clean = line.replace(/^[-*]\s*/, "");
          const kv = clean.match(/^([^:]+):\s*(.*)$/);
          if (kv) {
            const k = kv[1].trim().toLowerCase();
            const v = kv[2].trim();
            if (k.includes("навык")) currentWeapon.skill = v;
            else if (k === "wa") currentWeapon.wa = v || "0";
            else if (k.includes("урон")) currentWeapon.damage = v || "2d6";
            else if (k === "rof") currentWeapon.rof = Math.max(1, toInt(v, 1));
            else if (k.includes("боезапас")) {
              const pair = v.match(/(\d+)\s*\/\s*(\d+)/);
              if (pair) {
                currentWeapon.ammoCur = parseInt(pair[1], 10);
                currentWeapon.ammoMax = parseInt(pair[2], 10);
              } else if (/\d+/.test(v)) {
                const n = toInt(v, 0);
                currentWeapon.ammoCur = n;
                currentWeapon.ammoMax = n;
              }
            } else if (k.includes("дальност")) currentWeapon.range = v;
            else if (k.includes("особенност")) currentWeapon.notes = v;
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
        if (pair) {
          sb.cyberlimbs[limb.key] = { cur: parseInt(pair[1], 10), max: parseInt(pair[2], 10) };
        }
      }
    }
  }

  if (skillExtra.length) {
    sb.otherSkills = [sb.otherSkills, ...skillExtra].filter(Boolean).join("\n");
  }
  if (cyberLines.length) sb.cyberware = cyberLines.join("\n");
  if (gearLines.length) sb.gear = gearLines.join("\n");

  // Check if derived overrides differ from auto
  const auto = calcDerived(sb);
  const diffBtm = overrideBtm !== null && overrideBtm !== auto.btm;
  const diffDmg = overrideDmg !== null && overrideDmg !== auto.dmgBonus;
  const diffRun = overrideRun !== null && overrideRun !== auto.run;
  if (diffBtm || diffDmg || diffRun) {
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
  const armorRows = ARMOR_ZONES.map((z) => {
    const a = sb.armor[z.key];
    return `| ${z.label} | ${a.cur} / ${a.max} |`;
  }).join("\n");

  const weaponsText = sb.weapons.length
    ? sb.weapons
        .map(
          (w) =>
            `- **${w.name}:**\n` +
            `  - Навык: ${w.skill || "-"}\n` +
            `  - WA: ${w.wa || "0"}\n` +
            `  - Урон: ${w.damage || "-"}\n` +
            `  - ROF: ${w.rof}\n` +
            `  - Боезапас: ${w.ammoCur} / ${w.ammoMax}\n` +
            `  - Дальность: ${w.range || "-"}\n` +
            `  - Особенности: ${w.notes || "-"}`
        )
        .join("\n")
    : "- Нет";

  const gearLines = (sb.gear || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
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

/* ---------- Presets (localStorage + Built-in Starters) ---------- */
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
        TORSO: { cur: 14, max: 14 },
        HEAD: { cur: 0, max: 0 },
        R_ARM: { cur: 10, max: 10 },
        L_ARM: { cur: 10, max: 10 },
        R_LEG: { cur: 4, max: 4 },
        L_LEG: { cur: 4, max: 4 },
      },
      weapons: [
        {
          name: "Sternmeyer Type 35 (Тяж. пистолет)",
          skill: "+4",
          wa: "+0",
          damage: "3d6",
          rof: 2,
          ammoCur: 8,
          ammoMax: 8,
          range: "50 м",
          notes: "Бронежилет + кожаная куртка",
        },
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
      combatSkills: "ПП / Пистолеты-пулемёты +5, Винтовки +4, Атлетика +3, Внимание +5",
      otherSkills: "Тактика +3, Связь +3, Первая помощь +2",
      cyberware: "Смартлинк, Нейропроцессор, Наушник-радио",
      armor: {
        TORSO: { cur: 18, max: 18 },
        HEAD: { cur: 14, max: 14 },
        R_ARM: { cur: 14, max: 14 },
        L_ARM: { cur: 14, max: 14 },
        R_LEG: { cur: 14, max: 14 },
        L_LEG: { cur: 14, max: 14 },
      },
      weapons: [
        {
          name: "Arasaka Minami 10 (Средний ПП)",
          skill: "+5",
          wa: "+0",
          damage: "2d6+1",
          rof: 20,
          ammoCur: 40,
          ammoMax: 40,
          range: "150 м",
          notes: "Смартган (+2 к атаке со смартлинком)",
        },
        {
          name: "Шоковая дубинка",
          skill: "+4",
          wa: "+0",
          damage: "1d6",
          rof: 1,
          ammoCur: 10,
          ammoMax: 10,
          range: "Ближний",
          notes: "Оглушение (-2 к Спасброску ОГЛ)",
        },
      ],
      gear: "Наручники, тактический фонарь, 2 запасных магазина",
    }),
  },
  {
    id: "builtin_solo",
    name: "Опытный Соло / Наёмник",
    statblock: normalizeStatblock({
      name: "Элитный Соло",
      role: "Соло (Боевая интуиция +6)",
      stats: { "ИНТ": 7, "КРУТ": 8, "ПЕР": 7, "РЕФ": 9, "ПРВЛ": 6, "ТЕЛ": 8, "ТЕХ": 6, "УДАЧ": 6, "ЭМП": 4 },
      combatSkills: "Винтовки +7, Пистолеты +6, Боевые искусства +5, Уклонение +6, Осведомлённость +6",
      otherSkills: "Скрытность +5, Взлом +3",
      cyberware: "Керензиков (+2 Иниц.), Смартлинк, Подкожная броня (учтена в SP), Правая киберрука",
      armor: {
        TORSO: { cur: 20, max: 20 },
        HEAD: { cur: 18, max: 18 },
        R_ARM: { cur: 18, max: 18 },
        L_ARM: { cur: 18, max: 18 },
        R_LEG: { cur: 18, max: 18 },
        L_LEG: { cur: 18, max: 18 },
      },
      weapons: [
        {
          name: "Militech Ronin (Штурмовая винтовка)",
          skill: "+7",
          wa: "+1",
          damage: "5d6",
          rof: 30,
          ammoCur: 35,
          ammoMax: 35,
          range: "400 м",
          notes: "Смартган, ББ-патроны (SP ÷ 2, урон после пробития ÷ 2)",
        },
        {
          name: "Malorian 3516",
          skill: "+6",
          wa: "+0",
          damage: "4d6+2",
          rof: 1,
          ammoCur: 6,
          ammoMax: 6,
          range: "50 м",
          notes: "Усиленный пистолет",
        },
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
    // fallback in memory
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