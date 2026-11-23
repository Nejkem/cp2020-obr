import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/+esm";
import { META_KEY } from "./shared.js";
import { createSheetController } from "./ui.js";

const appEl = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const itemId = params.get("itemId");

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

  const controller = createSheetController({
    rootEl: appEl,
    onSave: saveStatblock,
    onOpenModal: null,
  });

  const items = await OBR.scene.items.getItems([itemId]);
  const item = items[0] || null;
  controller.setItem(item, item?.metadata?.[META_KEY] || null, true);

  OBR.scene.items.onChange((allItems) => {
    const updated = allItems.find((x) => x.id === itemId) || null;
    controller.setItem(updated, updated?.metadata?.[META_KEY] || null);
  });
});