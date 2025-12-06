let spotlightWindowId = null;

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-spotlight") return;

  // 如果 Spotlight 已經開著 → 關閉它
  if (spotlightWindowId) {
    try {
      await browser.windows.remove(spotlightWindowId);
    } catch (e) {
      console.error("Window already closed:", e);
    }
    spotlightWindowId = null;
    return;
  }

  // 開啟新的 Spotlight 視窗（置中小浮窗）
  const win = await browser.windows.create({
    url: "spotlight.html",
    type: "popup",
    width: 700,
    height: 120
  });

  spotlightWindowId = win.id;

  // 若使用者手動關閉，記得把 ID 清掉
  browser.windows.onRemoved.addListener((closedId) => {
    if (closedId === spotlightWindowId) {
      spotlightWindowId = null;
    }
  });
});
