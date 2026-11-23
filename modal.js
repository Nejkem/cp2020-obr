import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/+esm";
import { EXT_ID, META_KEY, getBasePath, loadLayoutPrefs, saveLayoutPrefs } from "./shared.js";
import { createSheetController } from "./ui.js";

const appEl = document.getElementById("app");
const basePath = getBasePath();
const params = new URLSearchParams(window.location.search);
const itemId = params.get("itemId");

function getModalPresetSize(mode) {
  if (mode === "S") return { width: 760, height: 700, fullScreen: false };
  if (mode === "L") return { width: 1260, height: 860, fullScreen: false };
  if (mode === "FULL") return { fullScreen: true };
  return { width: 1020, height: 780, fullScreen: false };
}

async function resizeModal(mode) {
  saveLayoutPrefs({ modalMode: mode });
  const sz = getModalPresetSize(mode);
  await OBR.modal.open({
    id: `${EXT_ID}/modal`,
    url: `${basePath}modal.html?itemId=${encodeURIComponent(itemId)}`,
    ...sz,
  });
}

async function saveStatblock(id, statblockOrNull) {
  await OBR.scene.items.updateItems([id], (items) => {
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

OBR.onReady(async () => {
  const role = await OBR.player.getRole();
  if (role !== "GM") {
    appEl.innerHTML = `<div class="empty-box">Доступно только Мастеру (GM).</div>`;
    return;
  }

  if (!itemId) {
    appEl.innerHTML = `<div class="empty-box">Не указана фишка.</div>`;
    return;
  }

  const prefs = loadLayoutPrefs();

  appEl.innerHTML = `
    <div class="topbar">
      <div class="topbar-group">
        <span style="font-weight:800;color:var(--cyan);font-size:12px;">CP2020 СТАТБЛОК v1.1</span>
      </div>
      <div class="topbar-group">
        <button class="btn btn-primary btn-xs" data-modal-dice>🎲 Кубики</button>
        <button class="btn btn-xs ${prefs.locked ? "" : "btn-lock-open"}" data-modal-lock title="Перестановка категорий">
          ${prefs.locked ? "🔒 Закреплено" : "🔓 Перестановка"}
        </button>
        <button class="btn btn-xs" data-modal-sections>👁 Разделы</button>
        <span class="muted">|</span>
        <button class="btn btn-xs ${prefs.modalMode === "S" ? "btn-primary" : ""}" data-modal-size="S">S</button>
        <button class="btn btn-xs ${prefs.modalMode === "M" ? "btn-primary" : ""}" data-modal-size="M">M</button>
        <button class="btn btn-xs ${prefs.modalMode === "L" ? "btn-primary" : ""}" data-modal-size="L">L</button>
        <button class="btn btn-xs ${prefs.modalMode === "FULL" ? "btn-primary" : ""}" data-modal-size="FULL">Весь экран</button>
        <button class="btn btn-danger btn-xs" data-modal-close>✕</button>
      </div>
    </div>
    <div id="modal-sheet-body"></div>
  `;

  const bodyEl = appEl.querySelector("#modal-sheet-body");
  const controller = createSheetController({
    rootEl: bodyEl,
    onSave: saveStatblock,
    onOpenModal: null,
  });

  appEl.querySelector("[data-modal-dice]")?.addEventListener("click", () => controller.openDiceDialog());
  appEl.querySelector("[data-modal-sections]")?.addEventListener("click", () => controller.openSectionsDialog());
  appEl.querySelector("[data-modal-lock]")?.addEventListener("click", (e) => {
    controller.toggleLock();
    const locked = controller.isLocked();
    e.currentTarget.textContent = locked ? "🔒 Закреплено" : "🔓 Перестановка";
    e.currentTarget.classList.toggle("btn-lock-open", !locked);
  });
  appEl.querySelectorAll("[data-modal-size]").forEach((btn) =>
    btn.addEventListener("click", () => resizeModal(btn.dataset.modalSize))
  );
  appEl.querySelector("[data-modal-close]")?.addEventListener("click", () => {
    OBR.modal.close(`${EXT_ID}/modal`);
  });

  const items = await OBR.scene.items.getItems([itemId]);
  const item = items[0] || null;
  controller.setItem(item, item?.metadata?.[META_KEY] || null, true);

  OBR.scene.items.onChange((allItems) => {
    const updated = allItems.find((x) => x.id === itemId) || null;
    controller.setItem(updated, updated?.metadata?.[META_KEY] || null);
  });
});