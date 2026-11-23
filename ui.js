import {
  ARMOR_ZONES,
  BUILTIN_PRESETS,
  CONCEAL_OPTIONS,
  CYBER_LIMBS,
  DEFAULT_SECTION_ORDER,
  QUICK_EFFECT_TAGS,
  SECTION_DEFS,
  STAT_KEYS,
  WOUND_TIERS,
  calcDerived,
  calcWeaponRanges,
  clamp,
  createEmptyStatblock,
  createEmptyWeapon,
  deleteSavedPreset,
  esc,
  exportMarkdownStatblock,
  getCyberlimbStatus,
  loadLayoutPrefs,
  loadRollHistory,
  loadSavedPresets,
  normalizeStatblock,
  parseMarkdownStatblock,
  rollD10,
  rollDicePool,
  rollFormula,
  saveLayoutPrefs,
  savePresetToStorage,
  saveRollHistory,
  toInt,
} from "./shared.js";

export function createSheetController({ rootEl, onSave, onOpenModal = null }) {
  let currentItem = null;
  let currentData = null;
  let lastSavedJson = "";
  let saveTimer = null;

  let exploding10 = true;
  let poolD10Count = 2;
  let poolD6Count = 3;
  let rollLog = loadRollHistory();
  let activeDialog = null; // "import" | "export" | "presets" | "sections" | "dice" | null
  let toastData = null;
  let toastTimer = null;
  let draggedSectionId = null;

  let layout = loadLayoutPrefs();
  let currentColsClass = "cols-1";

  function computeColsClass(width) {
    if (width >= 1040) return "cols-3";
    if (width >= 660) return "cols-2";
    return "cols-1";
  }

  // Адаптивное изменение числа колонок при растягивании окна
  const ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect?.width || window.innerWidth;
    const nextCls = computeColsClass(w);
    if (nextCls !== currentColsClass) {
      currentColsClass = nextCls;
      const grid = rootEl.querySelector(".cards-grid");
      if (grid) {
        grid.classList.remove("cols-1", "cols-2", "cols-3");
        grid.classList.add(currentColsClass);
      }
    }
  });
  ro.observe(rootEl);

  function getItemName(item) {
    return item?.text?.plainText?.trim() || item?.name || "Безымянная фишка";
  }

  function showToast(html, type = "normal") {
    toastData = { html, type };
    clearTimeout(toastTimer);
    renderToastOnly();
    toastTimer = setTimeout(() => {
      toastData = null;
      renderToastOnly();
    }, 8000);
  }

  function renderToastOnly() {
    let container = rootEl.querySelector("[data-toast-host]");
    if (!container) return;
    if (!toastData) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `
      <div class="roll-toast ${toastData.type}">
        <div style="font-size:12px;line-height:1.35;">${toastData.html}</div>
        <div class="toolbar-row" style="flex-shrink:0;">
          <button class="btn btn-xs" data-toast-history title="История бросков">📜</button>
          <button class="btn btn-xs" data-toast-close title="Скрыть">✕</button>
        </div>
      </div>
    `;
    container.querySelector("[data-toast-close]")?.addEventListener("click", () => {
      toastData = null;
      renderToastOnly();
    });
    container.querySelector("[data-toast-history]")?.addEventListener("click", () => {
      activeDialog = "dice";
      render();
    });
  }

  function pushRoll(html, type = "normal") {
    const time = new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const npcTag = currentData?.name ? `<span class="muted">${esc(currentData.name)}:</span> ` : "";
    rollLog.unshift({ time, html: npcTag + html, type });
    if (rollLog.length > 40) rollLog.pop();
    saveRollHistory(rollLog);
    showToast(html, type);
    if (activeDialog === "dice") {
      const logBox = rootEl.querySelector("[data-dice-history]");
      if (logBox) {
        logBox.innerHTML = renderRollLogItems();
      }
    }
  }

  function renderRollLogItems() {
    return rollLog.length
      ? rollLog
          .map(
            (e) =>
              `<div class="roll-entry ${e.type}"><span class="muted">[${esc(e.time)}]</span> ${e.html}</div>`
          )
          .join("")
      : `<div class="muted" style="font-size:12px;">История пуста. Нажми на любую характеристику, атаку, урон или брось кубы выше.</div>`;
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
    if (!item || !rawStatblock) {
      currentData = null;
      lastSavedJson = "";
      render();
      return;
    }

    const norm = normalizeStatblock(rawStatblock, getItemName(item));
    const json = JSON.stringify(norm);
    const sameItem = prevId === item.id;

    if (!forceRerender && sameItem && json === lastSavedJson) return;

    const activeEl = document.activeElement;
    if (
      !forceRerender &&
      sameItem &&
      activeEl &&
      rootEl.contains(activeEl) &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName)
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

  function openDiceDialog() {
    activeDialog = "dice";
    render();
  }

  function toggleLock() {
    layout = saveLayoutPrefs({ locked: !layout.locked });
    render();
  }

  function openSectionsDialog() {
    activeDialog = "sections";
    render();
  }

  function renderSectionCard(secId, d) {
    const def = SECTION_DEFS.find((s) => s.id === secId);
    if (!def) return "";
    const unlocked = !layout.locked;
    const isWide = layout.wideIds.includes(secId);

    const wrapCard = (title, headerRightHtml, bodyHtml) => `
      <div class="card ${unlocked ? "unlocked" : ""} ${isWide ? "card-wide" : ""}" data-sec-card="${secId}" ${unlocked ? 'draggable="true"' : ""}>
        <div class="card-header" data-sec-header="${secId}">
          <div class="card-title-wrap">
            ${unlocked ? `<span class="drag-grip" title="Перетащить категорию">⠿</span>` : ""}
            <span class="card-title">${title}</span>
          </div>
          <div class="toolbar-row">
            ${headerRightHtml || ""}
            ${
              unlocked
                ? `
                  <button class="btn btn-xs" data-sec-move="${secId}:-1" title="Переместить раньше">◀</button>
                  <button class="btn btn-xs" data-sec-move="${secId}:1" title="Переместить позже">▶</button>
                  <button class="btn btn-xs ${isWide ? "btn-primary" : ""}" data-sec-wide="${secId}" title="Ширина: 1 или 2 колонки">⬌</button>
                  <button class="btn btn-danger btn-xs" data-sec-hide="${secId}" title="Скрыть категорию для этого НПС">👁</button>
                `
                : ""
            }
          </div>
        </div>
        ${bodyHtml}
      </div>
    `;

    if (secId === "wounds") {
      const right = `
        <button class="btn btn-xs" data-wound-delta="-1">-1</button>
        <button class="btn btn-danger btn-xs" data-wound-delta="1">+1</button>
        <button class="btn btn-danger btn-xs" data-wound-delta="3">+3</button>
        <button class="btn btn-danger btn-xs" data-wound-delta="5">+5</button>
        <button class="btn btn-green btn-xs" data-wound-set="0">Сброс</button>
      `;
      const body = `
        <div class="wound-effects-banner">
          <div><span class="badge ${d.tierBadge}">${esc(d.tierName)}</span> &nbsp;${esc(d.tierEffect)}</div>
          <div style="font-weight:700;color:var(--amber);">
            ОГЛ <= ${d.stunTarget}${d.deathTarget !== null ? ` · <span style="color:#ff6b98;">СМЕРТЬ <= ${d.deathTarget}</span>` : ""}
          </div>
        </div>
        <div class="wound-tiers-compact">
          ${WOUND_TIERS.map((t) => {
            const isActive = d.tier && d.tier.name === t.name;
            const squares = [0, 1, 2, 3]
              .map((offset) => {
                const idx = t.min + offset;
                const filled = d.wounds >= idx;
                return `<div class="wbox ${filled ? `filled ${t.cls}` : ""}" data-wound-box="${idx}" title="Урон: ${idx}">${idx}</div>`;
              })
              .join("");
            return `
              <div class="wound-tier-block ${isActive ? "active-tier" : ""}">
                <div class="tier-meta">
                  <span class="tier-name">${t.name}</span>
                  <span class="tier-stun">ОГЛ ${t.stun}</span>
                </div>
                <div class="tier-squares">${squares}</div>
              </div>
            `;
          }).join("")}
        </div>
      `;
      return wrapCard(`Здоровье (${d.wounds}/40)`, right, body);
    }

    if (secId === "armor") {
      const right = `<button class="btn btn-green btn-xs" data-action="repair-armor">Починить всё</button>`;
      const body = `
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
      `;
      return wrapCard("Броня (SP)", right, body);
    }

    if (secId === "weapons") {
      const right = `<button class="btn btn-primary btn-xs" data-action="add-weapon">+ Ствол</button>`;
      const body = `
        <div class="weapon-list">
          ${
            currentData.weapons.length
              ? currentData.weapons
                  .map((w, idx) => {
                    const rng = calcWeaponRanges(w.range);
                    return `
                <div class="weapon-card">
                  <div class="weapon-head-row">
                    <input class="weapon-name-inp" type="text" data-w-idx="${idx}" data-w-field="name" value="${esc(w.name)}" placeholder="Название оружия" />
                    <input class="weapon-type-inp" type="text" data-w-idx="${idx}" data-w-field="type" value="${esc(w.type)}" placeholder="Тип (П/ПП)" title="Тип оружия" />
                    <input class="weapon-skill-inp" type="text" data-w-idx="${idx}" data-w-field="skill" value="${esc(w.skill)}" placeholder="Нав +4" title="Бонус навыка для атаки" />
                    <button class="btn btn-primary btn-xs" data-roll-attack="${idx}" title="1d10 + эфф. РЕФ + Навык + ТО">🎯 Атака</button>
                    <button class="btn btn-amber btn-xs" data-roll-dmg="${idx}" title="Бросить урон ${esc(w.damage)}">💥 Урон</button>
                    <button class="btn btn-danger btn-xs" data-del-weapon="${idx}" title="Удалить оружие">✕</button>
                  </div>

                  <div class="weapon-stats-strip">
                    <div class="field-mini">
                      <label>ТО</label>
                      <input type="text" data-w-idx="${idx}" data-w-field="wa" value="${esc(w.wa)}" placeholder="+0" />
                    </div>
                    <div class="field-mini">
                      <label>Скрыт</label>
                      <select data-w-idx="${idx}" data-w-field="conceal">
                        ${CONCEAL_OPTIONS.map(
                          (opt) => `<option value="${esc(opt)}" ${w.conceal === opt ? "selected" : ""}>${esc(opt)}</option>`
                        ).join("")}
                      </select>
                    </div>
                    <div class="field-mini">
                      <label>Урон</label>
                      <input type="text" data-w-idx="${idx}" data-w-field="damage" value="${esc(w.damage)}" placeholder="3d6" />
                    </div>
                    <div class="field-mini" style="grid-column: span 2;">
                      <label># Боезапас (тек / макс)</label>
                      <div class="ammo-inline">
                        <input type="number" min="0" data-w-idx="${idx}" data-w-field="ammoCur" value="${w.ammoCur}" />
                        <span>/</span>
                        <input type="number" min="0" data-w-idx="${idx}" data-w-field="ammoMax" value="${w.ammoMax}" />
                        <button class="btn btn-danger btn-xs" data-ammo-fire="${idx}:1">-1</button>
                        <button class="btn btn-danger btn-xs" data-ammo-fire="${idx}:${w.rof}" title="Выстрелить на весь СКО">-${w.rof}</button>
                        <button class="btn btn-green btn-xs" data-ammo-reload="${idx}" title="Перезарядить">↻</button>
                      </div>
                    </div>
                    <div class="field-mini">
                      <label>СКО</label>
                      <input type="number" min="1" data-w-idx="${idx}" data-w-field="rof" value="${w.rof}" />
                    </div>
                    <div class="field-mini">
                      <label>НАД</label>
                      <input type="text" data-w-idx="${idx}" data-w-field="rel" value="${esc(w.rel)}" placeholder="VR/ST" />
                    </div>
                    <div class="field-mini">
                      <label>Дистанция (м)</label>
                      <input type="text" data-w-idx="${idx}" data-w-field="range" value="${esc(w.range)}" placeholder="50" />
                    </div>
                  </div>

                  <div class="weapon-bottom-split">
                    <div class="weapon-details-col">
                      <div class="field-mini">
                        <label>Примечания</label>
                        <input type="text" data-w-idx="${idx}" data-w-field="notes" value="${esc(w.notes)}" placeholder="Смартган, ББ, ЛЦУ..." />
                      </div>
                      <div class="field-mini">
                        <label>Зарядники</label>
                        <input type="text" data-w-idx="${idx}" data-w-field="magazines" value="${esc(w.magazines)}" placeholder="2 полных, 1 неполный..." />
                      </div>
                      <div class="field-mini">
                        <label>Описание</label>
                        <textarea style="min-height:40px;" data-w-idx="${idx}" data-w-field="description" placeholder="Описание оружия...">${esc(w.description)}</textarea>
                      </div>
                    </div>

                    <div class="weapon-ranges-box">
                      <div style="font-size:10px;font-weight:800;color:var(--text-dim);text-transform:uppercase;">Дистанции огня (авто)</div>
                      <div class="range-grid" data-range-box="${idx}">
                        <div class="range-item"><span>Близко (¼):</span><strong>${rng.close}</strong></div>
                        <div class="range-item"><span>Средне (½):</span><strong>${rng.medium}</strong></div>
                        <div class="range-item"><span>Далеко (1×):</span><strong>${rng.far}</strong></div>
                        <div class="range-item"><span>Экстр. (2×):</span><strong>${rng.extreme}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
                  })
                  .join("")
              : `<div class="muted">Нет оружия. Нажми «+ Ствол», чтобы добавить.</div>`
          }
        </div>
      `;
      return wrapCard(`Оружие (${currentData.weapons.length})`, right, body);
    }

    if (secId === "stats") {
      const right = `<span class="muted" style="font-size:10px;">Клик по названию = бросок</span>`;
      const body = `
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
                  ${isPen ? `<span class="stat-eff" title="Со штрафом от ран">${baseVal}→${effVal}</span>` : ""}
                </div>
                <input class="stat-input" type="number" min="1" max="30" data-stat="${k}" value="${baseVal}" />
              </div>
            `;
          }).join("")}
        </div>
        <div class="derived-row">
          <div class="derived-pill"><span>МТЕЛ (BTM)</span><strong>${d.btm}</strong></div>
          <div class="derived-pill"><span>УРбонус</span><strong>${d.dmgBonusText}</strong></div>
          <div class="derived-pill"><span>БЕГ</span><strong>${d.run} м</strong></div>
        </div>
        <div class="derived-override">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" data-override-toggle ${currentData.derivedOverride.enabled ? "checked" : ""} />
            Ручная правка:
          </label>
          ${
            currentData.derivedOverride.enabled
              ? `<span>МТЕЛ</span><input type="number" data-ov="btm" value="${d.btm}" />
                 <span>УР</span><input type="number" data-ov="dmgBonus" value="${d.dmgBonus}" />
                 <span>БЕГ</span><input type="number" data-ov="run" value="${d.run}" />`
              : ""
          }
        </div>
      `;
      return wrapCard("Характеристики", right, body);
    }

    if (secId === "notes") {
      const right = `<button class="btn btn-xs" data-action="clear-notes">Очистить</button>`;
      const body = `
        <div class="tag-bar">
          ${QUICK_EFFECT_TAGS.map((t) => `<button type="button" class="tag-chip" data-add-tag="${esc(t)}">+ ${esc(t)}</button>`).join("")}
        </div>
        <textarea data-bind="notes" placeholder="Стимуляторы, состояния, особые детали боя...">${esc(currentData.notes)}</textarea>
      `;
      return wrapCard("Заметки / Наркотики / Эффекты", right, body);
    }

    if (secId === "skills") {
      const body = `
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
      `;
      return wrapCard("Навыки", "", body);
    }

    if (secId === "gear") {
      const body = `<textarea style="min-height:66px;" data-bind="gear" placeholder="Аптечки, гранаты, электроника, документы...">${esc(currentData.gear)}</textarea>`;
      return wrapCard("Прочее снаряжение", "", body);
    }

    if (secId === "cyberware") {
      const body = `<textarea style="min-height:66px;" data-bind="cyberware" placeholder="Импланты, оптика, ускорители...">${esc(currentData.cyberware)}</textarea>`;
      return wrapCard("Кибернетика", "", body);
    }

    if (secId === "sdp") {
      const right = `<span class="muted" style="font-size:10px;">10: отказ · 0: сломана</span>`;
      const body = CYBER_LIMBS.map((l) => {
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
      }).join("");
      return wrapCard("SDP киберконечностей", right, body);
    }

    return "";
  }

  function render() {
    currentColsClass = computeColsClass(rootEl.clientWidth || window.innerWidth);

    if (!currentItem) {
      rootEl.innerHTML = `
        <div data-toast-host></div>
        <div class="empty-box">
          <p style="font-size:14px;color:var(--text);font-weight:700;">Фишка не выбрана</p>
          <p>Кликни по любой фишке персонажа на карте — её статблок появится здесь мгновенно.</p>
          <p class="muted" style="font-size:11px;">Либо переключись на вкладку «Все НПС» сверху.</p>
        </div>
        ${renderDialog()}
      `;
      renderToastOnly();
      bindGlobalDialogEvents();
      return;
    }

    if (!currentData) {
      const tokenTitle = getItemName(currentItem);
      rootEl.innerHTML = `
        <div data-toast-host></div>
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
      renderToastOnly();
      bindEvents();
      return;
    }

    const d = calcDerived(currentData);
    const hiddenSet = new Set(currentData.hiddenSections || []);
    const visibleOrder = layout.order.filter((id) => !hiddenSet.has(id));

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
          ${onOpenModal ? `<button class="btn btn-primary btn-xs" data-action="open-modal" title="Открыть отдельное окно">⤢ Окно</button>` : ""}
          <button class="btn btn-xs" data-action="open-import" title="Импорт из Markdown">📥 Импорт</button>
          <button class="btn btn-xs" data-action="open-export" title="Экспорт в Markdown">📤 Экспорт</button>
          <button class="btn btn-xs" data-action="open-presets" title="Шаблоны НПС">📚 Шаблоны</button>
          <button class="btn btn-danger btn-xs" data-action="delete-statblock" title="Удалить статблок">🗑</button>
        </div>
      </div>
    `;

    rootEl.innerHTML = `
      <div data-toast-host></div>
      <div class="content">
        ${headerHtml}
        <div class="cards-grid ${currentColsClass}">
          ${visibleOrder.map((secId) => renderSectionCard(secId, d)).join("")}
        </div>
      </div>
      ${renderDialog()}
    `;

    renderToastOnly();
    bindEvents();
  }

  function renderDialog() {
    if (!activeDialog) return "";

    if (activeDialog === "dice") {
      const d = currentData ? calcDerived(currentData) : null;
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>🎲 Дайсроллер и История (только ГМ)</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer;">
                  <input type="checkbox" data-toggle-explode ${exploding10 ? "checked" : ""} />
                  Взрывные «10» на 1к10 (правило CP2020)
                </label>
                ${
                  d
                    ? `<div class="toolbar-row">
                        <button class="btn btn-amber btn-xs" data-quick-roll="stun">⚡ Спас ОГЛ (&lt;=${d.stunTarget})</button>
                        ${d.deathTarget !== null ? `<button class="btn btn-danger btn-xs" data-quick-roll="death">💀 Смерть (&lt;=${d.deathTarget})</button>` : ""}
                        <button class="btn btn-xs" data-quick-roll="init">⚡ Иниц (1к10+РЕФ)</button>
                      </div>`
                    : ""
                }
              </div>

              <div class="dice-pool-row">
                <strong style="min-width:34px;color:var(--cyan);">к10:</strong>
                <input type="number" min="1" max="30" id="pool-d10-cnt" value="${poolD10Count}" style="width:52px;text-align:center;" />
                <button class="btn btn-primary btn-xs" data-roll-pool="10">Кинуть к10</button>
                <button class="btn btn-xs" data-preset-pool="1:10">1к10</button>
                <button class="btn btn-xs" data-preset-pool="2:10">2к10</button>
                <button class="btn btn-xs" data-preset-pool="3:10">3к10</button>
              </div>

              <div class="dice-pool-row">
                <strong style="min-width:34px;color:var(--amber);">к6:</strong>
                <input type="number" min="1" max="30" id="pool-d6-cnt" value="${poolD6Count}" style="width:52px;text-align:center;" />
                <button class="btn btn-amber btn-xs" data-roll-pool="6">Кинуть к6</button>
                <button class="btn btn-xs" data-preset-pool="1:6">1к6</button>
                <button class="btn btn-xs" data-preset-pool="2:6">2к6</button>
                <button class="btn btn-xs" data-preset-pool="3:6">3к6</button>
                <button class="btn btn-xs" data-preset-pool="4:6">4к6</button>
                <button class="btn btn-xs" data-preset-pool="5:6">5к6</button>
                <button class="btn btn-xs" data-preset-pool="6:6">6к6</button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                <span style="font-size:11px;font-weight:800;color:var(--cyan);">ИСТОРИЯ БРОСКОВ</span>
                <button class="btn btn-xs" data-clear-history>Очистить историю</button>
              </div>
              <div class="roll-log" data-dice-history>
                ${renderRollLogItems()}
              </div>
            </div>
            <div class="dialog-foot">
              <button class="btn" data-close-dialog>Закрыть</button>
            </div>
          </div>
        </div>
      `;
    }

    if (activeDialog === "sections" && currentData) {
      const hiddenSet = new Set(currentData.hiddenSections || []);
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>👁 Разделы для «${esc(currentData.name)}»</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              <div class="toolbar-row">
                <button class="btn btn-xs" data-sec-preset="no-cyber">Скрыть кибернетику и SDP</button>
                <button class="btn btn-xs" data-sec-preset="show-all">Показать все</button>
                <button class="btn btn-xs" data-sec-preset="reset-order">Сбросить порядок</button>
              </div>
              ${layout.order
                .map((id) => {
                  const def = SECTION_DEFS.find((s) => s.id === id);
                  if (!def) return "";
                  const visible = !hiddenSet.has(id);
                  return `
                    <label class="section-toggle-row" style="cursor:pointer;">
                      <span>${esc(def.title)}</span>
                      <input type="checkbox" data-toggle-sec="${id}" ${visible ? "checked" : ""} />
                    </label>
                  `;
                })
                .join("")}
            </div>
            <div class="dialog-foot">
              <button class="btn btn-primary" data-close-dialog>Готово</button>
            </div>
          </div>
        </div>
      `;
    }

    if (activeDialog === "import") {
      return `
        <div class="dialog-backdrop" data-close-backdrop>
          <div class="dialog-box">
            <div class="dialog-head">
              <span>Импорт статблока из Markdown</span>
              <button class="btn btn-xs" data-close-dialog>✕</button>
            </div>
            <div class="dialog-body">
              <div class="muted" style="font-size:12px;">Вставь сюда текст статблока в формате Markdown — плагин сам заполнит характеристики, броню, оружие, навыки и SDP.</div>
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
                </div>`
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
                  </div>`
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
                </div>`
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

  function bindGlobalDialogEvents() {
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

    // Dice overlay controls
    rootEl.querySelector("[data-toggle-explode]")?.addEventListener("change", (e) => {
      exploding10 = e.target.checked;
    });
    rootEl.querySelector("#pool-d10-cnt")?.addEventListener("input", (e) => {
      poolD10Count = clamp(toInt(e.target.value, 1), 1, 30);
    });
    rootEl.querySelector("#pool-d6-cnt")?.addEventListener("input", (e) => {
      poolD6Count = clamp(toInt(e.target.value, 1), 1, 30);
    });
    rootEl.querySelectorAll("[data-roll-pool]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const sides = toInt(btn.dataset.rollPool, 10);
        const count = sides === 10 ? poolD10Count : poolD6Count;
        const res = rollDicePool(count, sides, sides === 10 && exploding10);
        pushRoll(`🎲 <b>${res.count}к${res.sides}</b>: [${res.groups.join(", ")}] = <b style="color:var(--cyan);">${res.total}</b>`);
      })
    );
    rootEl.querySelectorAll("[data-preset-pool]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [cntStr, sidesStr] = btn.dataset.presetPool.split(":");
        const count = toInt(cntStr, 1);
        const sides = toInt(sidesStr, 6);
        const res = rollDicePool(count, sides, sides === 10 && exploding10);
        pushRoll(`🎲 <b>${res.count}к${res.sides}</b>: [${res.groups.join(", ")}] = <b style="color:var(--cyan);">${res.total}</b>`);
      })
    );
    rootEl.querySelector("[data-clear-history]")?.addEventListener("click", () => {
      rollLog = [];
      saveRollHistory([]);
      const logBox = rootEl.querySelector("[data-dice-history]");
      if (logBox) logBox.innerHTML = renderRollLogItems();
    });
    rootEl.querySelectorAll("[data-quick-roll]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (!currentData) return;
        const type = btn.dataset.quickRoll;
        const d = calcDerived(currentData);
        if (type === "init") {
          const r = rollD10(exploding10);
          const ref = d.effStats["РЕФ"];
          pushRoll(`⚡ <b>Инициатива</b>: 1к10(${r.rolls.join("+")}) + РЕФ(${ref}) = <b style="color:var(--cyan);">${r.total + ref}</b>`);
        } else if (type === "stun") {
          const r = rollD10(false);
          const ok = r.first !== 10 && r.first <= d.stunTarget;
          pushRoll(
            `⚡ <b>Спас ОГЛ</b> (нужно <= ${d.stunTarget}): <b>${r.first}</b> → ${ok ? "<b style='color:var(--green);'>УСПЕХ</b>" : "<b style='color:var(--red);'>ОГЛУШЁН</b>"}`,
            ok ? "crit" : "fumble"
          );
        } else if (type === "death" && d.deathTarget !== null) {
          const r = rollD10(false);
          const ok = r.first !== 10 && r.first <= d.deathTarget;
          pushRoll(
            `💀 <b>Спас Смерти</b> (нужно <= ${d.deathTarget}): <b>${r.first}</b> → ${ok ? "<b style='color:var(--green);'>ЖИВ</b>" : "<b style='color:var(--red);'>СМЕРТЬ</b>"}`,
            ok ? "crit" : "fumble"
          );
        }
      })
    );
  }

  function bindEvents() {
    bindGlobalDialogEvents();

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
      if (!currentItem || !currentData) return;
      if (window.confirm(`Удалить статблок с фишки «${currentData.name}»?`)) {
        currentData = null;
        lastSavedJson = "";
        onSave(currentItem.id, null);
        render();
      }
    });

    // Import / Export / Presets
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

    // Sections visibility dialog controls
    rootEl.querySelectorAll("[data-toggle-sec]").forEach((chk) =>
      chk.addEventListener("change", () => {
        const id = chk.dataset.toggleSec;
        const set = new Set(currentData.hiddenSections || []);
        if (chk.checked) set.delete(id);
        else set.add(id);
        currentData.hiddenSections = Array.from(set);
        applyAndRender(true);
      })
    );
    rootEl.querySelectorAll("[data-sec-preset]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const mode = btn.dataset.secPreset;
        if (mode === "no-cyber") {
          const set = new Set(currentData.hiddenSections || []);
          set.add("cyberware");
          set.add("sdp");
          currentData.hiddenSections = Array.from(set);
          applyAndRender(true);
        } else if (mode === "show-all") {
          currentData.hiddenSections = [];
          applyAndRender(true);
        } else if (mode === "reset-order") {
          layout = saveLayoutPrefs({ order: [...DEFAULT_SECTION_ORDER], wideIds: ["weapons"] });
          render();
        }
      })
    );

    // Drag & Drop and Section ordering (when unlocked)
    if (!layout.locked) {
      rootEl.querySelectorAll("[data-sec-card]").forEach((card) => {
        const secId = card.dataset.secCard;

        card.addEventListener("dragstart", (e) => {
          if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName)) {
            e.preventDefault();
            return;
          }
          draggedSectionId = secId;
          card.classList.add("dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", secId);
          }
        });

        card.addEventListener("dragend", () => {
          draggedSectionId = null;
          card.classList.remove("dragging");
          rootEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
        });

        card.addEventListener("dragover", (e) => {
          if (!draggedSectionId || draggedSectionId === secId) return;
          e.preventDefault();
          card.classList.add("drag-over");
        });

        card.addEventListener("dragleave", () => {
          card.classList.remove("drag-over");
        });

        card.addEventListener("drop", (e) => {
          e.preventDefault();
          card.classList.remove("drag-over");
          const fromId = draggedSectionId || e.dataTransfer?.getData("text/plain");
          if (!fromId || fromId === secId) return;
          const nextOrder = [...layout.order];
          const fromIdx = nextOrder.indexOf(fromId);
          const toIdx = nextOrder.indexOf(secId);
          if (fromIdx < 0 || toIdx < 0) return;
          nextOrder.splice(fromIdx, 1);
          nextOrder.splice(toIdx, 0, fromId);
          layout = saveLayoutPrefs({ order: nextOrder });
          render();
        });
      });

      rootEl.querySelectorAll("[data-sec-move]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const [secId, dirStr] = btn.dataset.secMove.split(":");
          const dir = toInt(dirStr, 0);
          const hiddenSet = new Set(currentData.hiddenSections || []);
          const visible = layout.order.filter((id) => !hiddenSet.has(id));
          const visIdx = visible.indexOf(secId);
          const targetVisIdx = visIdx + dir;
          if (visIdx < 0 || targetVisIdx < 0 || targetVisIdx >= visible.length) return;
          const targetId = visible[targetVisIdx];
          const nextOrder = [...layout.order];
          const a = nextOrder.indexOf(secId);
          const b = nextOrder.indexOf(targetId);
          [nextOrder[a], nextOrder[b]] = [nextOrder[b], nextOrder[a]];
          layout = saveLayoutPrefs({ order: nextOrder });
          render();
        })
      );

      rootEl.querySelectorAll("[data-sec-wide]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const id = btn.dataset.secWide;
          const set = new Set(layout.wideIds || []);
          if (set.has(id)) set.delete(id);
          else set.add(id);
          layout = saveLayoutPrefs({ wideIds: Array.from(set) });
          render();
        })
      );

      rootEl.querySelectorAll("[data-sec-hide]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const id = btn.dataset.secHide;
          const set = new Set(currentData.hiddenSections || []);
          set.add(id);
          currentData.hiddenSections = Array.from(set);
          applyAndRender(true);
        })
      );
    }

    // Simple text binds
    rootEl.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("input", () => {
        currentData[el.dataset.bind] = el.value;
        scheduleSave(false);
      });
    });

    // Notes
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

    // Stats
    rootEl.querySelectorAll("[data-stat]").forEach((el) => {
      el.addEventListener("change", () => {
        currentData.stats[el.dataset.stat] = clamp(toInt(el.value, 5), 1, 30);
        applyAndRender(true);
      });
    });
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
        currentData.wounds = currentData.wounds === idx ? idx - 1 : idx;
        applyAndRender(true);
      })
    );

    // Armor
    rootEl.querySelector('[data-action="repair-armor"]')?.addEventListener("click", () => {
      for (const z of ARMOR_ZONES) currentData.armor[z.key].cur = currentData.armor[z.key].max;
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
        currentData.armor[el.dataset.armorCur].cur = Math.max(0, toInt(el.value, 0));
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
      currentData.weapons.push(createEmptyWeapon());
      applyAndRender(true);
    });
    rootEl.querySelectorAll("[data-del-weapon]").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentData.weapons.splice(toInt(btn.dataset.delWeapon, 0), 1);
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

        // Живое обновление блока авто-дистанций при вводе дальности
        if (field === "range") {
          const box = rootEl.querySelector(`[data-range-box="${idx}"]`);
          if (box) {
            const rng = calcWeaponRanges(w.range);
            box.innerHTML = `
              <div class="range-item"><span>Близко (¼):</span><strong>${rng.close}</strong></div>
              <div class="range-item"><span>Средне (½):</span><strong>${rng.medium}</strong></div>
              <div class="range-item"><span>Далеко (1×):</span><strong>${rng.far}</strong></div>
              <div class="range-item"><span>Экстр. (2×):</span><strong>${rng.extreme}</strong></div>
            `;
          }
        }
        scheduleSave(false);
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
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

    // Direct Stat / Attack / Damage rolls
    rootEl.querySelectorAll("[data-roll-stat]").forEach((el) =>
      el.addEventListener("click", () => {
        const k = el.dataset.rollStat;
        const d = calcDerived(currentData);
        const eff = d.effStats[k];
        const r = rollD10(exploding10);
        const total = eff + r.total;
        const tag = r.isOne ? " <b style='color:var(--red);'>[1 — ПРОВАЛ!]</b>" : r.isTen ? " <b style='color:var(--green);'>[10!]</b>" : "";
        pushRoll(
          `<b>${esc(k)}</b>: 1к10(${r.rolls.join("+")}) + ${eff} = <b style="color:var(--cyan);font-size:13px;">${total}</b>${tag}`,
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
        pushRoll(
          `🎯 <b>${esc(w.name)}</b>: 1к10(${r.rolls.join("+")}) + РЕФ(${ref}) + Нав(${skillVal}) + ТО(${waVal}) = <b style="color:var(--cyan);font-size:13px;">${total}</b>${tag}`,
          r.isOne ? "fumble" : r.isTen ? "crit" : "normal"
        );
      })
    );

    rootEl.querySelectorAll("[data-roll-dmg]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const w = currentData.weapons[toInt(btn.dataset.rollDmg, 0)];
        if (!w) return;
        const res = rollFormula(w.damage);
        pushRoll(`💥 <b>Урон (${esc(w.name)})</b>: <b style="color:var(--amber);">${esc(res.text)}</b>`);
      })
    );
  }

  return {
    setItem,
    render,
    openDiceDialog,
    toggleLock,
    openSectionsDialog,
    isLocked: () => layout.locked,
  };
}