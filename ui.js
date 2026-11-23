import {
  ARMOR_ZONES,
  BUILTIN_PRESETS,
  CYBER_LIMBS,
  QUICK_EFFECT_TAGS,
  STAT_KEYS,
  WOUND_TIERS,
  calcDerived,
  clamp,
  createEmptyStatblock,
  deleteSavedPreset,
  esc,
  exportMarkdownStatblock,
  getCyberlimbStatus,
  loadSavedPresets,
  normalizeStatblock,
  parseMarkdownStatblock,
  rollD10,
  rollFormula,
  savePresetToStorage,
  toInt,
} from "./shared.js";

/**
 * Создаёт контроллер карточки статблока (работает и в боковой панели, и в большом модальном окне)
 */
export function createSheetController({ rootEl, onSave, onOpenModal = null }) {
  let currentItem = null;
  let currentData = null;
  let lastSavedJson = "";
  let saveTimer = null;
  let exploding10 = true;
  let rollLog = [];
  let activeDialog = null; // "import" | "export" | "presets" | null

  function getItemName(item) {
    return item?.text?.plainText?.trim() || item?.name || "Безымянная фишка";
  }

  function pushLog(text, type = "normal") {
    const time = new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    rollLog.unshift({ time, text, type });
    if (rollLog.length > 25) rollLog.pop();
    renderLogOnly();
  }

  function renderLogOnly() {
    const logEl = rootEl.querySelector("[data-roll-log]");
    if (!logEl) return;
    logEl.innerHTML = rollLog.length
      ? rollLog
          .map(
            (e) =>
              `<div class="roll-entry ${e.type}"><span class="muted">[${esc(e.time)}]</span> ${e.text}</div>`
          )
          .join("")
      : `<div class="muted" style="font-size:11px;">Кликни по характеристике, атаке или кнопке броска.</div>`;
  }

  function scheduleSave(immediate = false) {
    if (!currentItem || !currentData) return;
    const payload = JSON.parse(JSON.stringify(currentData));
    const json = JSON.stringify(payload);
    if (json === lastSavedJson) return;

    clearTimeout(saveTimer);
    if (immediate) {
      lastSavedJson = json;
      onSave(currentItem.id, payload);
    } else {
      saveTimer = setTimeout(() => {
        lastSavedJson = json;
        onSave(currentItem.id, payload);
      }, 220);
    }
  }

  function setItem(item, rawStatblock, forceRerender = false) {
    const prevId = currentItem?.id;
    currentItem = item;
    if (!item) {
      currentData = null;
      lastSavedJson = "";
      render();
      return;
    }

    if (!rawStatblock) {
      currentData = null;
      lastSavedJson = "";
      render();
      return;
    }

    const norm = normalizeStatblock(rawStatblock, getItemName(item));
    const json = JSON.stringify(norm);
    const sameItem = prevId === item.id;

    // Если пришло то же состояние, которое мы сами только что сохранили — не перерисовываем DOM (не сбиваем фокус ввода)
    if (!forceRerender && sameItem && json === lastSavedJson) {
      return;
    }
    // Если пользователь сейчас редактирует input внутри этой же фишки — обновим аккуратно только при потере фокуса или смене фишки
    const activeEl = document.activeElement;
    if (
      !forceRerender &&
      sameItem &&
      activeEl &&
      rootEl.contains(activeEl) &&
      ["INPUT", "TEXTAREA"].includes(activeEl.tagName)
    ) {
      return;
    }

    currentData = norm;
    lastSavedJson = json;
    render();
  }

  function applyAndRender(immediate = true) {
    scheduleSave(immediate);
    render();
  }

  function render() {
    if (!currentItem) {
      rootEl.innerHTML = `
        <div class="empty-box">
          <p style="font-size:14px;color:var(--text);font-weight:700;">Фишка не выбрана</p>
          <p>Кликни по любой фишке персонажа на карте — её статблок появится здесь мгновенно.</p>
          <p class="muted" style="font-size:11px;">Либо переключись на вкладку «Все НПС» сверху.</p>
        </div>
      `;
      return;
    }

    if (!currentData) {
      const tokenTitle = getItemName(currentItem);
      rootEl.innerHTML = `
        <div class="content">
          <div class="npc-header">
            <div class="npc-title-wrap">
              <div style="font-weight:800;font-size:15px;">${esc(tokenTitle)}</div>
              <div class="muted">У этой фишки ещё нет статблока CP2020</div>
            </div>
          </div>
          <div class="card" style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn btn-primary" data-action="create-empty">+ Создать пустой статблок</button>
            <button class="btn" data-action="open-import">Вставить готовый текст (Markdown)</button>
            <button class="btn" data-action="open-presets">Выбрать из шаблонов НПС</button>
          </div>
        </div>
        ${renderDialog()}
      `;
      bindEvents();
      return;
    }

    const d = calcDerived(currentData);
    const isModal = Boolean(!onOpenModal);

    const headerHtml = `
      <div class="npc-header">
        <div class="npc-title-wrap">
          <input class="npc-name-input" type="text" data-bind="name" value="${esc(currentData.name)}" placeholder="Имя НПС" />
          <div class="npc-sub">
            <span>Роль:</span>
            <input type="text" data-bind="role" value="${esc(currentData.role)}" placeholder="Соло / Панк / Корп..." style="flex:1;min-width:110px;" />
            <span class="badge ${d.tierBadge}">${esc(d.tierName)} (${d.wounds}/40)</span>
          </div>
        </div>
        <div class="toolbar-row">
          ${onOpenModal ? `<button class="btn btn-primary btn-xs" data-action="open-modal" title="Развернуть в большое окно">⤢ Окно</button>` : ""}
          <button class="btn btn-xs" data-action="open-import" title="Импорт из Markdown">📥 Импорт</button>
          <button class="btn btn-xs" data-action="open-export" title="Экспорт в Markdown">📤 Экспорт</button>
          <button class="btn btn-xs" data-action="open-presets" title="Шаблоны НПС">📚 Шаблоны</button>
          <button class="btn btn-danger btn-xs" data-action="delete-statblock" title="Удалить статблок с фишки">🗑</button>
        </div>
      </div>
    `;

    const notesCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Заметки / Наркотики / Эффекты</span>
          <button class="btn btn-xs" data-action="clear-notes">Очистить</button>
        </div>
        <div class="tag-bar">
          ${QUICK_EFFECT_TAGS.map(
            (t) => `<button type="button" class="tag-chip" data-add-tag="${esc(t)}">+ ${esc(t)}</button>`
          ).join("")}
        </div>
        <textarea data-bind="notes" placeholder="Стимуляторы, состояния, особые детали боя...">${esc(currentData.notes)}</textarea>
      </div>
    `;

    const statsCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Характеристики (клик по названию = бросок)</span>
          <span class="muted" style="font-size:11px;">Эффект ран учтён</span>
        </div>
        <div class="stats-grid">
          ${STAT_KEYS.map((k) => {
            const baseVal = currentData.stats[k];
            const effVal = d.effStats[k];
            const isPen = d.penalizedKeys.has(k);
            const isSev = d.severeKeys.has(k);
            const boxCls = isSev ? "severe" : isPen ? "penalized" : "";
            return `
              <div class="stat-box ${boxCls}">
                <div class="stat-top">
                  <span class="stat-label" data-roll-stat="${k}" title="Бросить 1d10 + ${k}">${k} 🎲</span>
                  ${isPen ? `<span class="stat-eff" title="Текущее значение со штрафом">${baseVal} → ${effVal}</span>` : ""}
                </div>
                <div class="stat-input-row">
                  <input class="stat-input" type="number" min="1" max="30" data-stat="${k}" value="${baseVal}" />
                </div>
              </div>
            `;
          }).join("")}
        </div>
        <div class="derived-row">
          <div class="derived-pill">
            <span>МТЕЛ (BTM)</span>
            <strong>${d.btm}</strong>
          </div>
          <div class="derived-pill">
            <span>УРбонус</span>
            <strong>${d.dmgBonusText}</strong>
          </div>
          <div class="derived-pill">
            <span>БЕГ</span>
            <strong>${d.run} м</strong>
          </div>
        </div>
        <div class="derived-override">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" data-override-toggle ${currentData.derivedOverride.enabled ? "checked" : ""} />
            Ручная правка (импланты):
          </label>
          ${
            currentData.derivedOverride.enabled
              ? `
                <span>МТЕЛ</span><input type="number" data-ov="btm" value="${d.btm}" />
                <span>УР</span><input type="number" data-ov="dmgBonus" value="${d.dmgBonus}" />
                <span>БЕГ</span><input type="number" data-ov="run" value="${d.run}" />
              `
              : ""
          }
        </div>
      </div>
    `;

    const woundsCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Здоровье (${d.wounds} / 40)</span>
          <div class="toolbar-row">
            <button class="btn btn-xs" data-wound-delta="-1">-1</button>
            <button class="btn btn-danger btn-xs" data-wound-delta="1">+1</button>
            <button class="btn btn-danger btn-xs" data-wound-delta="3">+3</button>
            <button class="btn btn-danger btn-xs" data-wound-delta="5">+5</button>
            <button class="btn btn-green btn-xs" data-wound-set="0">Сброс</button>
          </div>
        </div>
        <div class="wound-effects-banner">
          <div><span class="badge ${d.tierBadge}">${esc(d.tierName)}</span> &nbsp;${esc(d.tierEffect)}</div>
          <div style="font-weight:700;color:var(--amber);">
            ОГЛ <= ${d.stunTarget}${d.deathTarget !== null ? ` · <span style="color:#ff6b98;">СМЕРТЬ <= ${d.deathTarget}</span>` : ""}
          </div>
        </div>
        <div class="wound-tiers">
          ${WOUND_TIERS.map((t) => {
            const isActive = d.tier && d.tier.name === t.name;
            const boxes = [0, 1, 2, 3].map((offset) => {
              const idx = t.min + offset;
              const filled = d.wounds >= idx;
              return `<div class="wbox ${filled ? `filled ${t.cls}` : ""}" data-wound-box="${idx}" title="Ранений: ${idx}"></div>`;
            }).join("");
            return `
              <div class="wound-tier-row ${isActive ? "active-tier" : ""}">
                <span class="tier-name">${t.name}</span>
                <div class="tier-boxes">${boxes}</div>
                <span class="tier-stun">ОГЛ ${t.stun}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const armorCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Броня (SP)</span>
          <button class="btn btn-green btn-xs" data-action="repair-armor">Починить всё</button>
        </div>
        <div class="armor-grid">
          ${ARMOR_ZONES.map((z) => {
            const a = currentData.armor[z.key];
            const broken = a.max > 0 && a.cur === 0;
            return `
              <div class="armor-cell ${broken ? "broken" : ""}">
                <div class="armor-head">
                  <span>${z.label}</span>
                  <span class="muted" style="font-size:10px;">${a.cur}/${a.max}</span>
                </div>
                <div class="armor-controls">
                  <button class="btn btn-danger btn-xs" data-armor-delta="${z.key}:-1">-1</button>
                  <input type="number" min="0" data-armor-cur="${z.key}" value="${a.cur}" title="Текущий SP" />
                  <span>/</span>
                  <input type="number" min="0" data-armor-max="${z.key}" value="${a.max}" title="Макс. SP" />
                  <button class="btn btn-xs" data-armor-delta="${z.key}:1">+1</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const weaponsCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Оружие (${currentData.weapons.length})</span>
          <button class="btn btn-primary btn-xs" data-action="add-weapon">+ Ствол</button>
        </div>
        <div class="weapon-list">
          ${
            currentData.weapons.length
              ? currentData.weapons
                  .map(
                    (w, idx) => `
              <div class="weapon-card">
                <div class="weapon-top">
                  <input type="text" data-w-idx="${idx}" data-w-field="name" value="${esc(w.name)}" placeholder="Название оружия" />
                  <button class="btn btn-primary btn-xs" data-roll-attack="${idx}" title="1d10 + эфф. РЕФ + Навык + WA">🎯 Атака</button>
                  <button class="btn btn-amber btn-xs" data-roll-dmg="${idx}" title="Бросить урон ${esc(w.damage)}">💥 Урон</button>
                  <button class="btn btn-danger btn-xs" data-del-weapon="${idx}" title="Удалить оружие">✕</button>
                </div>
                <div class="weapon-meta-grid">
                  <div class="field-mini">
                    <label>Навык</label>
                    <input type="text" data-w-idx="${idx}" data-w-field="skill" value="${esc(w.skill)}" placeholder="+5" />
                  </div>
                  <div class="field-mini">
                    <label>WA</label>
                    <input type="text" data-w-idx="${idx}" data-w-field="wa" value="${esc(w.wa)}" placeholder="+0" />
                  </div>
                  <div class="field-mini">
                    <label>Урон</label>
                    <input type="text" data-w-idx="${idx}" data-w-field="damage" value="${esc(w.damage)}" placeholder="3d6" />
                  </div>
                  <div class="field-mini">
                    <label>ROF</label>
                    <input type="number" min="1" data-w-idx="${idx}" data-w-field="rof" value="${w.rof}" />
                  </div>
                  <div class="field-mini">
                    <label>Дальность</label>
                    <input type="text" data-w-idx="${idx}" data-w-field="range" value="${esc(w.range)}" placeholder="50 м" />
                  </div>
                  <div class="field-mini">
                    <label>Особенности</label>
                    <input type="text" data-w-idx="${idx}" data-w-field="notes" value="${esc(w.notes)}" placeholder="Смарт, ББ..." />
                  </div>
                </div>
                <div class="weapon-ammo-bar">
                  <div style="display:flex;align-items:center;gap:4px;">
                    <span class="muted" style="font-size:11px;">Патроны:</span>
                    <input type="number" min="0" style="width:46px;text-align:center;" data-w-idx="${idx}" data-w-field="ammoCur" value="${w.ammoCur}" />
                    <span>/</span>
                    <input type="number" min="0" style="width:46px;text-align:center;" data-w-idx="${idx}" data-w-field="ammoMax" value="${w.ammoMax}" />
                  </div>
                  <div class="toolbar-row">
                    <button class="btn btn-danger btn-xs" data-ammo-fire="${idx}:1">-1</button>
                    <button class="btn btn-danger btn-xs" data-ammo-fire="${idx}:${w.rof}">-ROF (${w.rof})</button>
                    <button class="btn btn-green btn-xs" data-ammo-reload="${idx}">Перезарядка</button>
                  </div>
                </div>
              </div>
            `
                  )
                  .join("")
              : `<div class="muted">Нет оружия. Нажми «+ Ствол», чтобы добавить.</div>`
          }
        </div>
      </div>
    `;

    const rollerCard = `
      <div class="roller-box">
        <div class="card-header" style="margin-bottom:6px;">
          <span class="card-title">Мини-дайсроллер (только ГМ)</span>
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" data-toggle-explode ${exploding10 ? "checked" : ""} />
            Взрывные «10»
          </label>
        </div>
        <div class="roller-controls">
          <button class="btn btn-primary btn-xs" data-quick-roll="d10">🎲 1d10</button>
          <button class="btn btn-xs" data-quick-roll="d6">🎲 1d6</button>
          <button class="btn btn-amber btn-xs" data-quick-roll="stun">⚡ Спас ОГЛ (&lt;=${d.stunTarget})</button>
          ${
            d.deathTarget !== null
              ? `<button class="btn btn-danger btn-xs" data-quick-roll="death">💀 Спас Смерти (&lt;=${d.deathTarget})</button>`
              : ""
          }
          <button class="btn btn-xs" data-quick-roll="init">⚡ Инициатива (1d10+РЕФ)</button>
        </div>
        <div class="roll-log" data-roll-log></div>
      </div>
    `;

    const skillsCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Навыки</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div class="field-mini">
            <label>Боевые навыки</label>
            <textarea data-bind="combatSkills" placeholder="Пистолеты +5, Винтовки +4, Драка +4...">${esc(currentData.combatSkills)}</textarea>
          </div>
          <div class="field-mini">
            <label>Прочие навыки</label>
            <textarea data-bind="otherSkills" placeholder="Осведомлённость +4, Скрытность +3...">${esc(currentData.otherSkills)}</textarea>
          </div>
        </div>
      </div>
    `;

    const cyberCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Кибернетика и снаряжение</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div class="field-mini">
            <label>Кибернетика</label>
            <textarea data-bind="cyberware" placeholder="Импланты, оптика, ускорители...">${esc(currentData.cyberware)}</textarea>
          </div>
          <div class="field-mini">
            <label>Прочее снаряжение</label>
            <textarea data-bind="gear" placeholder="Аптечки, гранаты, электроника...">${esc(currentData.gear)}</textarea>
          </div>
        </div>
      </div>
    `;

    const sdpCard = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">SDP кибернетических конечностей</span>
          <span class="muted" style="font-size:10px;">10: отказ · 0: уничтожена</span>
        </div>
        ${CYBER_LIMBS.map((l) => {
          const v = currentData.cyberlimbs[l.key];
          const st = getCyberlimbStatus(v);
          return `
            <div class="limb-row">
              <span style="font-size:12px;font-weight:600;">${l.label}</span>
              <div class="limb-inputs">
                <button class="btn btn-danger btn-xs" data-limb-delta="${l.key}:-5">-5</button>
                <button class="btn btn-danger btn-xs" data-limb-delta="${l.key}:-1">-1</button>
                <input type="number" min="0" data-limb-cur="${l.key}" value="${v.cur}" />
                <span>/</span>
                <input type="number" min="0" data-limb-max="${l.key}" value="${v.max}" />
                <button class="btn btn-green btn-xs" data-limb-fix="${l.key}" title="Починить">↻</button>
              </div>
              <span class="${st.cls}">${st.label}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;

    if (isModal) {
      rootEl.innerHTML = `
        <div class="content">
          ${headerHtml}
          ${rollerCard}
          <div class="sheet-columns">
            <div class="col-stack">
              ${woundsCard}
              ${statsCard}
              ${armorCard}
              ${sdpCard}
            </div>
            <div class="col-stack">
              ${notesCard}
              ${weaponsCard}
              ${skillsCard}
              ${cyberCard}
            </div>
          </div>
        </div>
        ${renderDialog()}
      `;
    } else {
      rootEl.innerHTML = `
        <div class="content">
          ${headerHtml}
          ${notesCard}
          ${rollerCard}
          ${woundsCard}
          ${armorCard}
          ${weaponsCard}
          ${statsCard}
          ${skillsCard}
          ${cyberCard}
          ${sdpCard}
        </div>
        ${renderDialog()}
      `;
    }

    renderLogOnly();
    bindEvents();
  }

  function renderDialog() {
    if (!activeDialog) return "";
    if (activeDialog === "import") {
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>Импорт статблока из Markdown</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              <div class="muted" style="font-size:12px;">Вставь сюда текст статблока в формате Markdown — плагин сам заполнит все характеристики, броню, оружие, навыки и SDP.</div>
              <textarea id="md-import-area" style="min-height:240px;font-family:monospace;font-size:11px;" placeholder="## ХАРАКТЕРИСТИКИ ..."></textarea>
            </div>
            <div class="dialog-foot">
              <button class="btn" data-close-dialog>Отмена</button>
              <button class="btn btn-primary" data-confirm-import>Распознать и применить</button>
            </div>
          </div>
        </div>
      `;
    }
    if (activeDialog === "export") {
      const md = currentData ? exportMarkdownStatblock(currentData) : "";
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>Экспорт в Markdown</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              <textarea id="md-export-area" readonly style="min-height:260px;font-family:monospace;font-size:11px;">${esc(md)}</textarea>
            </div>
            <div class="dialog-foot">
              <button class="btn" data-close-dialog>Закрыть</button>
              <button class="btn btn-primary" data-copy-export>Копировать текст</button>
            </div>
          </div>
        </div>
      `;
    }
    if (activeDialog === "presets") {
      const saved = loadSavedPresets();
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>Шаблоны НПС</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              ${
                currentData
                  ? `
                <div style="display:flex;gap:6px;">
                  <input id="new-preset-name" type="text" value="${esc(currentData.name)}" placeholder="Название шаблона" style="flex:1;" />
                  <button class="btn btn-primary" data-save-preset>💾 Сохранить текущего</button>
                </div>
              `
                  : ""
              }
              <div style="font-size:11px;font-weight:800;color:var(--cyan);margin-top:4px;">МОИ ШАБЛОНЫ</div>
              ${
                saved.length
                  ? saved
                      .map(
                        (p) => `
                  <div class="preset-item">
                    <div>
                      <div style="font-weight:700;">${esc(p.name)}</div>
                      <div class="muted" style="font-size:11px;">${esc(p.statblock?.role || "НПС")}</div>
                    </div>
                    <div class="toolbar-row">
                      <button class="btn btn-primary btn-xs" data-load-user-preset="${esc(p.id)}">Применить</button>
                      <button class="btn btn-danger btn-xs" data-del-user-preset="${esc(p.id)}">✕</button>
                    </div>
                  </div>
                `
                      )
                      .join("")
                  : `<div class="muted" style="font-size:12px;">Пока нет сохранённых шаблонов.</div>`
              }
              <div style="font-size:11px;font-weight:800;color:var(--cyan);margin-top:6px;">БАЗОВЫЕ ШАБЛОНЫ CP2020</div>
              ${BUILTIN_PRESETS.map(
                (p) => `
                <div class="preset-item">
                  <div>
                    <div style="font-weight:700;">${esc(p.name)}</div>
                    <div class="muted" style="font-size:11px;">${esc(p.statblock.role)}</div>
                  </div>
                  <button class="btn btn-primary btn-xs" data-load-builtin="${esc(p.id)}">Применить</button>
                </div>
              `
              ).join("")}
            </div>
            <div class="dialog-foot">
              <button class="btn" data-close-dialog>Закрыть</button>
            </div>
          </div>
        </div>
      `;
    }
    return "";
  }

  function bindEvents() {
    // Dialog close
    rootEl.querySelectorAll("[data-close-dialog]").forEach((btn) =>
      btn.addEventListener("click", () => {
        activeDialog = null;
        render();
      })
    );
    const backdrop = rootEl.querySelector("[data-close-backdrop]");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          activeDialog = null;
          render();
        }
      });
    }

    // Empty token actions
    rootEl.querySelector('[data-action="create-empty"]')?.addEventListener("click", () => {
      currentData = createEmptyStatblock(getItemName(currentItem));
      applyAndRender(true);
    });
    rootEl.querySelector('[data-action="open-import"]')?.addEventListener("click", () => {
      activeDialog = "import";
      render();
    });
    rootEl.querySelector('[data-action="open-export"]')?.addEventListener("click", () => {
      activeDialog = "export";
      render();
    });
    rootEl.querySelector('[data-action="open-presets"]')?.addEventListener("click", () => {
      activeDialog = "presets";
      render();
    });
    rootEl.querySelector('[data-action="open-modal"]')?.addEventListener("click", () => {
      if (onOpenModal && currentItem) onOpenModal(currentItem.id);
    });
    rootEl.querySelector('[data-action="delete-statblock"]')?.addEventListener("click", () => {
      if (!currentItem) return;
      if (window.confirm(`Удалить статблок с фишки «${currentData.name}»?`)) {
        currentData = null;
        lastSavedJson = "";
        onSave(currentItem.id, null);
        render();
      }
    });

    // Dialog actions
    rootEl.querySelector("[data-confirm-import]")?.addEventListener("click", () => {
      const txt = rootEl.querySelector("#md-import-area")?.value || "";
      if (!txt.trim()) return;
      currentData = parseMarkdownStatblock(txt, getItemName(currentItem));
      activeDialog = null;
      applyAndRender(true);
    });
    rootEl.querySelector("[data-copy-export]")?.addEventListener("click", async () => {
      const area = rootEl.querySelector("#md-export-area");
      if (!area) return;
      try {
        await navigator.clipboard.writeText(area.value);
        const btn = rootEl.querySelector("[data-copy-export]");
        if (btn) btn.textContent = "Скопировано ✓";
      } catch {
        area.select();
        document.execCommand("copy");
      }
    });
    rootEl.querySelector("[data-save-preset]")?.addEventListener("click", () => {
      const name = rootEl.querySelector("#new-preset-name")?.value || currentData.name;
      savePresetToStorage(name, currentData);
      render();
    });
    rootEl.querySelectorAll("[data-load-builtin]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const p = BUILTIN_PRESETS.find((x) => x.id === btn.dataset.loadBuiltin);
        if (p) {
          currentData = normalizeStatblock(JSON.parse(JSON.stringify(p.statblock)), getItemName(currentItem));
          activeDialog = null;
          applyAndRender(true);
        }
      })
    );
    rootEl.querySelectorAll("[data-load-user-preset]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const p = loadSavedPresets().find((x) => x.id === btn.dataset.loadUserPreset);
        if (p) {
          currentData = normalizeStatblock(JSON.parse(JSON.stringify(p.statblock)), getItemName(currentItem));
          activeDialog = null;
          applyAndRender(true);
        }
      })
    );
    rootEl.querySelectorAll("[data-del-user-preset]").forEach((btn) =>
      btn.addEventListener("click", () => {
        deleteSavedPreset(btn.dataset.delUserPreset);
        render();
      })
    );

    if (!currentData) return;

    // Simple text binds
    rootEl.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("input", () => {
        currentData[el.dataset.bind] = el.value;
        scheduleSave(false);
      });
    });

    // Clear notes & effect tags
    rootEl.querySelector('[data-action="clear-notes"]')?.addEventListener("click", () => {
      currentData.notes = "";
      applyAndRender(true);
    });
    rootEl.querySelectorAll("[data-add-tag]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const tag = btn.dataset.addTag;
        const cur = currentData.notes.trim();
        currentData.notes = cur ? `${cur}, ${tag}` : tag;
        applyAndRender(true);
      })
    );

    // Stats inputs
    rootEl.querySelectorAll("[data-stat]").forEach((el) => {
      el.addEventListener("change", () => {
        currentData.stats[el.dataset.stat] = clamp(toInt(el.value, 5), 1, 30);
        applyAndRender(true);
      });
    });

    // Derived overrides
    rootEl.querySelector("[data-override-toggle]")?.addEventListener("change", (e) => {
      currentData.derivedOverride.enabled = e.target.checked;
      applyAndRender(true);
    });
    rootEl.querySelectorAll("[data-ov]").forEach((el) => {
      el.addEventListener("change", () => {
        currentData.derivedOverride[el.dataset.ov] = toInt(el.value, 0);
        applyAndRender(true);
      });
    });

    // Wounds
    rootEl.querySelectorAll("[data-wound-delta]").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentData.wounds = clamp(currentData.wounds + toInt(btn.dataset.woundDelta, 0), 0, 40);
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-wound-set]").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentData.wounds = clamp(toInt(btn.dataset.woundSet, 0), 0, 40);
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-wound-box]").forEach((box) =>
      box.addEventListener("click", () => {
        const idx = toInt(box.dataset.woundBox, 1);
        // Повторный клик по текущей последней заполненной ячейке уменьшает на 1
        currentData.wounds = currentData.wounds === idx ? idx - 1 : idx;
        applyAndRender(true);
      })
    );

    // Armor
    rootEl.querySelector('[data-action="repair-armor"]')?.addEventListener("click", () => {
      for (const z of ARMOR_ZONES) {
        currentData.armor[z.key].cur = currentData.armor[z.key].max;
      }
      applyAndRender(true);
    });
    rootEl.querySelectorAll("[data-armor-delta]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [zoneKey, deltaStr] = btn.dataset.armorDelta.split(":");
        const a = currentData.armor[zoneKey];
        a.cur = clamp(a.cur + toInt(deltaStr, 0), 0, Math.max(a.max, 999));
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-armor-cur]").forEach((el) =>
      el.addEventListener("change", () => {
        const key = el.dataset.armorCur;
        currentData.armor[key].cur = Math.max(0, toInt(el.value, 0));
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-armor-max]").forEach((el) =>
      el.addEventListener("change", () => {
        const key = el.dataset.armorMax;
        const maxVal = Math.max(0, toInt(el.value, 0));
        currentData.armor[key].max = maxVal;
        if (currentData.armor[key].cur > maxVal) currentData.armor[key].cur = maxVal;
        applyAndRender(true);
      })
    );

    // Weapons
    rootEl.querySelector('[data-action="add-weapon"]')?.addEventListener("click", () => {
      currentData.weapons.push({
        name: "Новое оружие",
        skill: "+4",
        wa: "+0",
        damage: "2d6",
        rof: 2,
        ammoCur: 12,
        ammoMax: 12,
        range: "50 м",
        notes: "",
      });
      applyAndRender(true);
    });
    rootEl.querySelectorAll("[data-del-weapon]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const idx = toInt(btn.dataset.delWeapon, 0);
        currentData.weapons.splice(idx, 1);
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-w-field]").forEach((el) => {
      const handler = () => {
        const idx = toInt(el.dataset.wIdx, 0);
        const field = el.dataset.wField;
        const w = currentData.weapons[idx];
        if (!w) return;
        if (field === "rof") w.rof = Math.max(1, toInt(el.value, 1));
        else if (field === "ammoCur" || field === "ammoMax") w[field] = Math.max(0, toInt(el.value, 0));
        else w[field] = el.value;
        scheduleSave(false);
      };
      el.addEventListener("input", handler);
      if (el.type === "number") el.addEventListener("change", () => applyAndRender(true));
    });
    rootEl.querySelectorAll("[data-ammo-fire]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [idxStr, costStr] = btn.dataset.ammoFire.split(":");
        const w = currentData.weapons[toInt(idxStr, 0)];
        if (!w) return;
        w.ammoCur = Math.max(0, w.ammoCur - toInt(costStr, 1));
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-ammo-reload]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const w = currentData.weapons[toInt(btn.dataset.ammoReload, 0)];
        if (!w) return;
        w.ammoCur = w.ammoMax;
        applyAndRender(true);
      })
    );

    // Cyberlimbs
    rootEl.querySelectorAll("[data-limb-delta]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [k, deltaStr] = btn.dataset.limbDelta.split(":");
        const l = currentData.cyberlimbs[k];
        l.cur = clamp(l.cur + toInt(deltaStr, 0), 0, Math.max(l.max, 999));
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-limb-fix]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const l = currentData.cyberlimbs[btn.dataset.limbFix];
        l.cur = l.max;
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-limb-cur]").forEach((el) =>
      el.addEventListener("change", () => {
        currentData.cyberlimbs[el.dataset.limbCur].cur = Math.max(0, toInt(el.value, 0));
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-limb-max]").forEach((el) =>
      el.addEventListener("change", () => {
        const k = el.dataset.limbMax;
        const m = Math.max(0, toInt(el.value, 0));
        currentData.cyberlimbs[k].max = m;
        if (currentData.cyberlimbs[k].cur > m) currentData.cyberlimbs[k].cur = m;
        applyAndRender(true);
      })
    );

    // Dice roller
    rootEl.querySelector("[data-toggle-explode]")?.addEventListener("change", (e) => {
      exploding10 = e.target.checked;
    });

    rootEl.querySelectorAll("[data-roll-stat]").forEach((el) =>
      el.addEventListener("click", () => {
        const k = el.dataset.rollStat;
        const d = calcDerived(currentData);
        const eff = d.effStats[k];
        const r = rollD10(exploding10);
        const total = eff + r.total;
        const tag = r.isOne ? " <b style='color:var(--red);'>[1 — ПРОВАЛ/ОСЕЧКА!]</b>" : r.isTen ? " <b style='color:var(--green);'>[10!]</b>" : "";
        pushLog(
          `<b>${esc(k)}</b>: 1d10(${r.rolls.join("+")}) + ${eff} = <b style="color:var(--cyan);font-size:13px;">${total}</b>${tag}`,
          r.isOne ? "fumble" : r.isTen ? "crit" : "normal"
        );
      })
    );

    rootEl.querySelectorAll("[data-roll-attack]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const w = currentData.weapons[toInt(btn.dataset.rollAttack, 0)];
        if (!w) return;
        const d = calcDerived(currentData);
        const ref = d.effStats["РЕФ"];
        const skillVal = toInt(w.skill, 0);
        const waVal = toInt(w.wa, 0);
        const r = rollD10(exploding10);
        const total = r.total + ref + skillVal + waVal;
        const tag = r.isOne ? " <b style='color:var(--red);'>[1 — ОСЕЧКА/ПРОМАХ!]</b>" : r.isTen ? " <b style='color:var(--green);'>[КРИТ 10!]</b>" : "";
        pushLog(
          `🎯 <b>${esc(w.name)}</b>: 1d10(${r.rolls.join("+")}) + РЕФ(${ref}) + Нав(${skillVal}) + WA(${waVal}) = <b style="color:var(--cyan);font-size:13px;">${total}</b>${tag}`,
          r.isOne ? "fumble" : r.isTen ? "crit" : "normal"
        );
      })
    );

    rootEl.querySelectorAll("[data-roll-dmg]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const w = currentData.weapons[toInt(btn.dataset.rollDmg, 0)];
        if (!w) return;
        const res = rollFormula(w.damage);
        pushLog(`💥 <b>Урон (${esc(w.name)})</b>: <b style="color:var(--amber);">${esc(res.text)}</b>`);
      })
    );

    rootEl.querySelectorAll("[data-quick-roll]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const type = btn.dataset.quickRoll;
        const d = calcDerived(currentData);
        if (type === "d10") {
          const r = rollD10(exploding10);
          pushLog(`🎲 <b>1d10</b>: [${r.rolls.join(" + ")}] = <b style="color:var(--cyan);">${r.total}</b>`, r.isOne ? "fumble" : r.isTen ? "crit" : "normal");
        } else if (type === "d6") {
          const res = rollFormula("1d6");
          pushLog(`🎲 <b>1d6</b>: ${esc(res.text)}`);
        } else if (type === "init") {
          const r = rollD10(exploding10);
          const ref = d.effStats["РЕФ"];
          pushLog(`⚡ <b>Инициатива</b>: 1d10(${r.rolls.join("+")}) + РЕФ(${ref}) = <b style="color:var(--cyan);">${r.total + ref}</b>`);
        } else if (type === "stun") {
          const r = rollD10(false);
          const ok = r.first !== 10 && r.first <= d.stunTarget;
          pushLog(
            `⚡ <b>Спасбросок ОГЛ</b> (нужно <= ${d.stunTarget}): выпало <b>${r.first}</b> → ${ok ? "<b style='color:var(--green);'>УСПЕХ</b>" : "<b style='color:var(--red);'>ПРОВАЛ (ОГЛУШЁН)</b>"}`,
            ok ? "crit" : "fumble"
          );
        } else if (type === "death" && d.deathTarget !== null) {
          const r = rollD10(false);
          const ok = r.first !== 10 && r.first <= d.deathTarget;
          pushLog(
            `💀 <b>Спасбросок Смерти</b> (нужно <= ${d.deathTarget}): выпало <b>${r.first}</b> → ${ok ? "<b style='color:var(--green);'>ЖИВ</b>" : "<b style='color:var(--red);'>СМЕРТЬ</b>"}`,
            ok ? "crit" : "fumble"
          );
        }
      })
    );
  }

  return { setItem, render };
}