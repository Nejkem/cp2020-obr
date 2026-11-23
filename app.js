import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/+esm";
import {
  EXT_ID,
  META_KEY,
  calcDerived,
  clamp,
  esc,
  getBasePath,
  loadLayoutPrefs,
  saveLayoutPrefs,
} from "./shared.js";
import { createSheetController } from "./ui.js";

const appEl = document.getElementById("app");
const basePath = getBasePath();

let isGM = false;
let activeTab = "selected"; // "selected" | "roster"
let searchQuery = "";
let sceneItems = [];
let activeItemId = null;
let sheetController = null;

function getModalPresetSize(mode) {
  if (mode === "S") return { width: 760, height: 700, fullScreen: false };
  if (mode === "L") return { width: 1260, height: 860, fullScreen: false };
  if (mode === "FULL") return { fullScreen: true };
  return { width: 1020, height: 780, fullScreen: false };
}

function openModalForItem(itemId) {
  const prefs = loadLayoutPrefs();
  const sz = getModalPresetSize(prefs.modalMode);
  OBR.modal.open({
    id: `${EXT_ID}/modal`,
    url: `${basePath}modal.html?itemId=${encodeURIComponent(itemId)}`,
    ...sz,
  });
}

async function applyPopoverSize(w, h) {
  const maxW = Math.min(1400, (window.screen?.availWidth || 1400) - 80);
  const maxH = Math.min(1000, (window.screen?.availHeight || 1000) - 90);
  const width = clamp(Math.round(w), 380, Math.max(480, maxW));
  const height = clamp(Math.round(h), 420, Math.max(500, maxH));
  saveLayoutPrefs({ popoverWidth: width, popoverHeight: height });
  await OBR.action.setWidth(width);
  await OBR.action.setHeight(height);
}

async function saveStatblock(itemId, statblockOrNull) {
  await OBR.scene.items.updateItems([itemId], (items) => {
    for (const item of items) {
      if (!item.metadata) item.metadata = {};
      if (statblockOrNull === null) {
        delete item.metadata[META_KEY];
      } else {
        item.metadata[META_KEY] = statblockOrNull;
      }
    }
  });
}

async function registerContextMenu() {
  await OBR.contextMenu.create({
    id: `${EXT_ID}/context-menu`,
    icons: [
      {
        icon: `${basePath}icon.svg`,
        label: "CP2020: Статблок",
        filter: {
          every: [{ key: "layer", value: "CHARACTER" }],
          roles: ["GM"],
        },
      },
    ],
    onClick(context) {
      const target = context.items?.[0];
      if (target) openModalForItem(target.id);
    },
  });
}

function bindResizeCorner(handleEl) {
  if (!handleEl) return;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;
  let pendingTimer = null;

  handleEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.screenX;
    startY = e.screenY;
    const prefs = loadLayoutPrefs();
    startW = window.innerWidth || prefs.popoverWidth;
    startH = window.innerHeight || prefs.popoverHeight;
    handleEl.setPointerCapture(e.pointerId);
  });

  handleEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const nw = startW + (e.screenX - startX);
    const nh = startH + (e.screenY - startY);
    if (!pendingTimer) {
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        applyPopoverSize(nw, nh);
      }, 45);
    }
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    const nw = startW + (e.screenX - startX);
    const nh = startH + (e.screenY - startY);
    applyPopoverSize(nw, nh);
  };
  handleEl.addEventListener("pointerup", stop);
  handleEl.addEventListener("pointercancel", stop);
}

function renderShell() {
  if (!isGM) {
    appEl.innerHTML = `
      <div class="empty-box">
        <p style="font-weight:700;color:var(--text);">CP2020 GM Statblocks</p>
        <p>Этот инструмент предназначен только для Мастера (GM).</p>
      </div>
    `;
    return;
  }

  const statCount = sceneItems.filter((it) => Boolean(it.metadata?.[META_KEY])).length;
  const prefs = loadLayoutPrefs();

  appEl.innerHTML = `
    <div class="topbar">
      <div class="topbar-group">
        <div class="tabs">
          <button class="tab-btn ${activeTab === "selected" ? "active" : ""}" data-tab="selected">Выбранный</button>
          <button class="tab-btn ${activeTab === "roster" ? "active" : ""}" data-tab="roster">Все НПС (${statCount})</button>
        </div>
      </div>
      <div class="topbar-group">
        <button class="btn btn-primary btn-xs" data-top-dice title="Дайсроллер и история бросков">🎲 Кубики</button>
        ${
          activeTab === "selected"
            ? `
              <button class="btn btn-xs ${prefs.locked ? "" : "btn-lock-open"}" data-top-lock title="Разрешить/запретить перетаскивание категорий">
                ${prefs.locked ? "🔒" : "🔓"}
              </button>
              <button class="btn btn-xs" data-top-sections title="Показать/скрыть категории">👁 Разделы</button>
            `
            : ""
        }
        <button class="btn btn-xs" data-pop-size="460:720" title="Узкое окно">S</button>
        <button class="btn btn-xs" data-pop-size="760:760" title="Среднее окно (2 колонки)">M</button>
        <button class="btn btn-xs" data-pop-size="1080:820" title="Широкое окно (3 колонки)">L</button>
      </div>
    </div>
    <div id="tab-body"></div>
    <div class="resize-corner" data-resize-corner title="Потяни мышкой, чтобы растянуть окно">◢</div>
  `;

  bindResizeCorner(appEl.querySelector("[data-resize-corner]"));

  appEl.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      renderShell();
    });
  });

  appEl.querySelectorAll("[data-pop-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [w, h] = btn.dataset.popSize.split(":").map(Number);
      applyPopoverSize(w, h);
    });
  });

  const bodyEl = appEl.querySelector("#tab-body");

  if (activeTab === "selected") {
    sheetController = createSheetController({
      rootEl: bodyEl,
      onSave: saveStatblock,
      onOpenModal: openModalForItem,
    });
    const currentItem = sceneItems.find((it) => it.id === activeItemId) || null;
    sheetController.setItem(currentItem, currentItem?.metadata?.[META_KEY] || null, true);

    appEl.querySelector("[data-top-dice]")?.addEventListener("click", () => sheetController.openDiceDialog());
    appEl.querySelector("[data-top-sections]")?.addEventListener("click", () => sheetController.openSectionsDialog());
    appEl.querySelector("[data-top-lock]")?.addEventListener("click", (e) => {
      sheetController.toggleLock();
      const locked = sheetController.isLocked();
      e.currentTarget.textContent = locked ? "🔒" : "🔓";
      e.currentTarget.classList.toggle("btn-lock-open", !locked);
    });
  } else {
    sheetController = createSheetController({ rootEl: bodyEl, onSave: saveStatblock });
    appEl.querySelector("[data-top-dice]")?.addEventListener("click", () => sheetController.openDiceDialog());
    renderRoster(bodyEl);
  }
}

function renderRoster(container) {
  const withBlocks = sceneItems.filter((it) => Boolean(it.metadata?.[META_KEY]));
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? withBlocks.filter((it) => {
        const sb = it.metadata[META_KEY];
        return (
          (sb.name || "").toLowerCase().includes(q) ||
          (sb.role || "").toLowerCase().includes(q) ||
          (sb.notes || "").toLowerCase().includes(q)
        );
      })
    : withBlocks;

  container.innerHTML = `
    <div class="content">
      <div style="display:flex;gap:6px;">
        <input id="roster-search" type="text" placeholder="Поиск по имени, роли, заметкам..." value="${esc(searchQuery)}" style="flex:1;" />
      </div>
      ${
        filtered.length
          ? `<div class="roster-list">
              ${filtered
                .map((it) => {
                  const sb = it.metadata[META_KEY];
                  const d = calcDerived(sb);
                  const torso = sb.armor?.TORSO || { cur: 0, max: 0 };
                  const head = sb.armor?.HEAD || { cur: 0, max: 0 };
                  return `
                    <div class="roster-card ${it.id === activeItemId ? "selected" : ""}">
                      <div class="roster-top">
                        <div>
                          <div class="roster-name" data-pick-npc="${esc(it.id)}">${esc(sb.name || "НПС")}</div>
                          <div class="muted" style="font-size:11px;">${esc(sb.role || "Без роли")}</div>
                        </div>
                        <span class="badge ${d.tierBadge}">${esc(d.tierName)} ${d.wounds}/40</span>
                      </div>
                      <div class="roster-stats-line">
                        <span>РЕФ: <b>${d.effStats["РЕФ"]}</b></span>
                        <span>Торс SP: <b>${torso.cur}/${torso.max}</b></span>
                        <span>Гол SP: <b>${head.cur}/${head.max}</b></span>
                        <span>ОГЛ: <b><=${d.stunTarget}</b></span>
                      </div>
                      ${sb.notes ? `<div style="font-size:11px;color:#d8b4fe;">📝 ${esc(sb.notes)}</div>` : ""}
                      <div class="toolbar-row" style="justify-content:space-between;">
                        <div class="toolbar-row">
                          <button class="btn btn-xs" data-roster-wound="${esc(it.id)}:-1">-1 рана</button>
                          <button class="btn btn-danger btn-xs" data-roster-wound="${esc(it.id)}:1">+1</button>
                          <button class="btn btn-danger btn-xs" data-roster-wound="${esc(it.id)}:3">+3</button>
                        </div>
                        <div class="toolbar-row">
                          <button class="btn btn-xs" data-focus-npc="${esc(it.id)}" title="Показать фишку на карте">🎯 Найти</button>
                          <button class="btn btn-primary btn-xs" data-open-modal="${esc(it.id)}">⤢ Открыть</button>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>`
          : `<div class="empty-box">На этой сцене ещё нет фишек со статблоками.<br/>Выдели любую фишку на карте и открой вкладку «Выбранный» (или кликни ПКМ по фишке → CP2020: Статблок).</div>`
      }
    </div>
  `;

  container.querySelector("#roster-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderRoster(container);
    const input = container.querySelector("#roster-search");
    if (input) {
      input.focus();
      input.setSelectionRange(searchQuery.length, searchQuery.length);
    }
  });

  container.querySelectorAll("[data-pick-npc]").forEach((el) =>
    el.addEventListener("click", () => {
      activeItemId = el.dataset.pickNpc;
      activeTab = "selected";
      renderShell();
    })
  );

  container.querySelectorAll("[data-open-modal]").forEach((btn) =>
    btn.addEventListener("click", () => openModalForItem(btn.dataset.openModal))
  );

  container.querySelectorAll("[data-focus-npc]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        const bounds = await OBR.scene.items.getItemBounds([btn.dataset.focusNpc]);
        await OBR.viewport.animateToBounds(bounds);
      } catch {
        // ignore
      }
    })
  );

  container.querySelectorAll("[data-roster-wound]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const [id, deltaStr] = btn.dataset.rosterWound.split(":");
      const item = sceneItems.find((x) => x.id === id);
      const sb = item?.metadata?.[META_KEY];
      if (!sb) return;
      const next = { ...sb, wounds: clamp((sb.wounds || 0) + parseInt(deltaStr, 10), 0, 40) };
      await saveStatblock(id, next);
    })
  );
}

function updateViewFromState() {
  if (!isGM) return;
  if (activeTab === "selected" && sheetController) {
    const item = sceneItems.find((it) => it.id === activeItemId) || null;
    sheetController.setItem(item, item?.metadata?.[META_KEY] || null);
  } else if (activeTab === "roster") {
    const bodyEl = appEl.querySelector("#tab-body");
    if (bodyEl) renderRoster(bodyEl);
    const statCount = sceneItems.filter((it) => Boolean(it.metadata?.[META_KEY])).length;
    const rosterBtn = appEl.querySelector('[data-tab="roster"]');
    if (rosterBtn) rosterBtn.textContent = `Все НПС (${statCount})`;
  }
}

OBR.onReady(async () => {
  const role = await OBR.player.getRole();
  isGM = role === "GM";

  if (!isGM) {
    renderShell();
    return;
  }

  // Восстановим сохранённый размер бокового окна
  const prefs = loadLayoutPrefs();
  await applyPopoverSize(prefs.popoverWidth, prefs.popoverHeight);

  await registerContextMenu();

  const ready = await OBR.scene.isReady();
  if (ready) sceneItems = await OBR.scene.items.getItems();
  const sel = await OBR.player.getSelection();
  if (sel && sel.length > 0) activeItemId = sel[0];

  renderShell();

  OBR.player.onChange((player) => {
    const nextRole = player.role === "GM";
    if (nextRole !== isGM) {
      isGM = nextRole;
      renderShell();
      return;
    }
    const nextSel = player.selection?.[0] || null;
    if (nextSel && nextSel !== activeItemId) {
      activeItemId = nextSel;
      if (activeTab === "selected") updateViewFromState();
    }
  });

  OBR.scene.onReadyChange(async (isReady) => {
    sceneItems = isReady ? await OBR.scene.items.getItems() : [];
    renderShell();
  });

  OBR.scene.items.onChange((items) => {
    sceneItems = items;
    updateViewFromState();
  });
});