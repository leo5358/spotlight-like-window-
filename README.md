 # Firefox Spotlight Hybrid

[English](#english) | [繁體中文](#traditional-chinese)

---

<a name="english"></a>
## English

**Firefox Spotlight Hybrid** is a productivity extension that brings a macOS Spotlight-like command palette to Firefox. It allows you to quickly switch tabs, search bookmarks, access history, and perform web searches without leaving your keyboard.

### Key Features

* **Quick Launch**: Press `Command+Shift+9` (or custom shortcut) to open the search bar instantly.
* **Hybrid Display Engine**:
    * **Overlay Mode**: Injects a sleek, floating modal directly into the web page you are viewing.
    * **Popup Window Mode**: Automatically falls back to a standalone popup window on restricted pages (e.g., `about:config`, `addons.mozilla.org`) where content scripts are blocked.
* **Dark Mode UI**: Designed with a clean, deep dark aesthetic to reduce eye strain.
* **Smart Search**:
    * **Switch Tabs**: Find and jump to open tabs across windows.
    * **Bookmarks**: Search your saved bookmarks.
    * **History**: Retrieve recently visited pages.
    * **Web Search**: Default fallback to web search.

### Usage

1.  **Activate**: Press `Cmd+Shift+9` (Mac) or `Ctrl+Shift+9` (Windows/Linux).
2.  **Navigate**: Use `Arrow Up` / `Arrow Down` to select results, and `Enter` to open.
3.  **Search Modes** (Prefix commands):
    * `%b [keyword]` : Search **Bookmarks** only.
    * `%h [keyword]` : Search **History** only.
    * `%s [keyword]` : Force **Web Search**.
    * *(No prefix)* : Search everything (Open Tabs + Bookmarks + Web).

### Installation (Developer Mode)

Since this extension is not yet on the Firefox Add-ons Store, you can load it temporarily:

1.  Open Firefox and navigate to `about:debugging`.
2.  Click **"This Firefox"** on the left sidebar.
3.  Click **"Load Temporary Add-on..."**.
4.  Select the `manifest.json` file from this project folder.
5.  Done! The extension is now active.

### Permissions

This extension requires `<all_urls>` permission to inject the overlay UI into web pages. We respect your privacy and do not collect any data.

---

<a name="traditional-chinese"></a>
## Traditional Chinese (繁體中文)

**Firefox Spotlight Hybrid** 是一個提升生產力的 Firefox 擴充套件，為瀏覽器帶來類似 macOS Spotlight 的全域命令列體驗。讓你不需離開鍵盤，即可快速切換分頁、搜尋書籤、歷史紀錄或進行網頁搜尋。

### 核心功能

* **快速啟動**：按下 `Command+Shift+9`（或自訂快捷鍵）即可瞬間呼叫搜尋列。
* **混合式顯示引擎 (Hybrid Engine)**：
    * **疊加層模式 (Overlay)**：在一般網頁上，搜尋框會以浮動視窗形式直接顯示在頁面中央，體驗流暢。
    * **獨立視窗模式 (Popup Window)**：在受限制的頁面（如 `about:config` 系統頁面或 Firefox 附加元件商店）無法注入腳本時，會自動切換為獨立彈出視窗，確保功能隨處可用。
* **深色模式設計**：精心調整的深色介面，視覺舒適且專業。
* **智慧搜尋**：
    * **切換分頁**：快速搜尋並跳轉到已開啟的分頁。
    * **書籤搜尋**：即時檢索你的收藏內容。
    * **歷史紀錄**：找回最近瀏覽過的網站。
    * **網頁搜尋**：直接透過預設引擎搜尋網路。

### 使用說明

1.  **啟動**：按下 `Cmd+Shift+9` (Mac) 或 `Ctrl+Shift+9` (Windows/Linux)。
2.  **操作**：使用 `方向鍵 上/下` 選擇結果，按下 `Enter` 執行。
3.  **搜尋模式** (前綴指令)：
    * `%b [關鍵字]` : 僅搜尋 **書籤 (Bookmarks)**。
    * `%h [關鍵字]` : 僅搜尋 **歷史紀錄 (History)**。
    * `%s [關鍵字]` : 強制進行 **網頁搜尋**。
    * *(無前綴)* : 綜合搜尋 (已開啟分頁 + 書籤 + 網頁)。

### 安裝教學 (開發者模式)

目前此套件尚未上架至 Firefox Add-ons 商店，你可以透過以下方式安裝試用：

1.  打開 Firefox，在網址列輸入 `about:debugging` 並進入。
2.  點擊左側選單的 **"This Firefox"**。
3.  點擊 **"Load Temporary Add-on..." (載入暫時的附加元件)** 按鈕。
4.  選擇專案資料夾中的 `manifest.json` 檔案。
5.  完成！現在你可以開始使用 Spotlight 功能了。

### 權限說明

本套件需要 `<all_urls>` 權限以便將搜尋介面 (Overlay) 注入至您瀏覽的網頁中。我們重視您的隱私，不會收集任何個人數據。
