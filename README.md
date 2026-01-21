# Firefox Spotlight Hybrid

[English](#english) | [繁體中文](#traditional-chinese)

---

<a name="english"></a>
## English

**Firefox Spotlight Hybrid** is a high-productivity extension that brings an integrated command palette to Firefox. Seamlessly switch tabs, search bookmarks, access history, and perform web searches without ever leaving your keyboard.

### Key Features

* **Quick Launch**: Press `Command+Shift+9` (Mac) or `Ctrl+Shift+9` (Windows/Linux) to summon the palette.
* **Hybrid Display Engine**:
    * **Overlay Mode**: A sleek, floating modal injected directly into standard web pages.
    * **Popup Window Mode**: Automatic fallback to a standalone window on restricted pages (e.g., `about:config`, `addons.mozilla.org`).
* **Smart Search**:
    * **Tabs**: `%t` Find and jump to open tabs.
    * **Bookmarks**: `%b` Instant access to your saved sites.
    * **History**: `%h` Retrieve recently visited pages.
    * **Web Search**: `%s` Default fallback or forced web search.
* **Fully Customizable**: Define custom search engines (e.g., `@wiki` for Wikipedia) and personalize **badge colors** to match your workflow.
* **Privacy Focused**: Designed with a deep dark aesthetic and zero data collection.

### Installation

#### From Firefox Add-ons (Recommended)
1.  Visit the [Firefox Add-ons Store](https://addons.mozilla.org/firefox/addon/spotlight-hybrid/) (Link placeholder).
2.  Click **"Add to Firefox"**.

#### Developer Mode (Manual)
1.  Download this repository and unzip it.
2.  Open Firefox and go to `about:debugging`.
3.  Click **"This Firefox"** -> **"Load Temporary Add-on..."**.
4.  Select the `manifest.json` file in the project folder.

### Usage

* **`Enter`**: Open/Switch in the current tab.
* **`Shift + Enter`**: Open in a new tab.
* **`Arrow Up/Down`**: Navigate through results.
* **`Esc`**: Close the palette.

### Privacy & Permissions

This extension is built with a "Privacy-First" philosophy. We do not collect, track, or sell your data.
1. Data Collection & Processing
    * No Tracking: We do not collect your browsing history, search queries, or personal information.
    * Local Execution: All search operations (Tabs, Bookmarks, and History) are performed locally on your device using Firefox's native APIs.
    * Zero Telemetry: No analytics or tracking scripts are included in this extension.
2. Justification for Permissions
    * <all_urls> & scripting: Required to inject the floating search interface (Overlay) onto the web pages you visit, allowing you to use the tool without leaving your current tab.
    * tabs: Needed to search and switch between your currently open tabs.
    * bookmarks & history: Required to provide instant search results from your saved bookmarks and browsing history.
    * storage: Used exclusively to save your custom settings, such as search prefixes and badge colors.
3. Data Storage
    * Your preferences are stored using browser.storage.sync, which may sync your settings across your Firefox account but never leaves the Firefox ecosystem.

---

<a name="traditional-chinese"></a>
## Traditional Chinese (繁體中文)

**Firefox Spotlight Hybrid** 是一款提升生產力的工具，為 Firefox 提供了整合式指令面板。讓你不需離開鍵盤，即可流暢地切換分頁、搜尋書籤、存取歷史紀錄或進行網頁搜尋。

### 核心功能

* **快速啟動**：按下 `Command+Shift+9` (Mac) 或 `Ctrl+Shift+9` (Windows/Linux) 瞬間呼叫搜尋列。
* **混合式顯示引擎**：
    * **疊加層模式 (Overlay)**：在一般網頁上以浮動視窗形式顯示，體驗流暢。
    * **獨立視窗模式 (Popup Window)**：在受限頁面（如 `about:config`）自動切換為獨立視窗，確保功能不中斷。
* **智慧搜尋指令**：
    * **分頁搜尋**：使用 `%t` 快速跳轉已開啟的分頁。
    * **書籤搜尋**：使用 `%b` 即時檢索收藏內容。
    * **歷史紀錄**：使用 `%h` 找回最近瀏覽的網站。
    * **網頁搜尋**：使用 `%s` 進行 Google 搜尋。
* **高度客製化**：可自訂搜尋引擎（如 `@wiki`）與各模式的標籤顏色。
* **隱私與美學**：專業深色模式設計，且絕不收集任何使用者資訊。

### 安裝教學

#### 從 Firefox 附加元件商店 (推薦)
1.  前往 [Firefox 附加元件商店](https://addons.mozilla.org/firefox/addon/spotlight-hybrid/) (連結佔位)。
2.  點擊 **「新增至 Firefox」**。

#### 開發者模式 (手動安裝)
1.  下載此專案並解壓縮。
2.  打開 Firefox，在網址列輸入 `about:debugging`。
3.  點擊左側 **「This Firefox」** -> **「載入暫時的附加元件...」**。
4.  選擇專案資料夾中的 `manifest.json` 檔案。

### 操作說明

* **`Enter`**：在當前分頁開啟或切換。
* **`Shift + Enter`**：在新聞分頁開啟。
* **`方向鍵 上/下`**：選擇搜尋結果。
* **`Esc`**：關閉搜尋面板。

### 隱私與權限說明

本套件基於「隱私至上」的原則開發。我們不會收集、追蹤或販售您的個人資料。
1. 資料收集與處理
    * 無追蹤行為：我們不會收集您的瀏覽紀錄、搜尋關鍵字或個人資訊。
    * 本地端執行：所有的搜尋功能（分頁、書籤與歷史紀錄）皆透過 Firefox 原生 API 在您的裝置上本地執行。
    * 無遙測數據：本套件不包含任何分析工具或追蹤腳本。
2. 權限使用說明
    * <all_urls> 與 scripting：用於將浮動搜尋介面 (Overlay) 注入至您瀏覽的網頁中，讓您無需離開當前分頁即可操作。
    * tabs (分頁)：用於搜尋並快速切換至您已開啟的分頁。
    * bookmarks (書籤) 與 history (歷史紀錄)：用於即時檢索您儲存的書籤與瀏覽紀錄。
    * storage (儲存)：僅用於儲存您的自訂設定，例如搜尋前綴與標籤顏色。
3. 資料儲存
    * 您的設定會透過 browser.storage.sync 進行儲存，這僅會在您的 Firefox 帳號間同步設定，資料絕不會流向任何第三方伺服器。