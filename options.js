const defaultSettings = {
    prefixes: {
      tab: "%t",
      bookmark: "%b",
      history: "%h",
      search: "%s"
    },
    customEngines: []
  };
  
  let currentSettings = { ...defaultSettings };
  
  function restoreOptions() {
    browser.storage.sync.get(defaultSettings).then((res) => {
      currentSettings = res;
      
      // 還原基本前綴
      document.querySelector("#prefix-tab").value = res.prefixes.tab;
      document.querySelector("#prefix-bookmark").value = res.prefixes.bookmark;
      document.querySelector("#prefix-history").value = res.prefixes.history;
      document.querySelector("#prefix-search").value = res.prefixes.search;
      
      // 還原自訂搜尋引擎列表
      renderEngines();
    });
  }
  
  function renderEngines() {
    const tbody = document.querySelector("#engine-list tbody");
    tbody.innerHTML = "";
    
    if (!currentSettings.customEngines) currentSettings.customEngines = [];
  
    currentSettings.customEngines.forEach((engine, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code>${engine.prefix}</code></td>
        <td>${engine.name}</td>
        <td style="color:#aaa; font-size:12px; word-break: break-all;">${engine.url}</td>
        <td><button class="btn-remove" data-index="${index}">✕</button></td>
      `;
      tbody.appendChild(tr);
    });
  
    // 綁定刪除按鈕事件
    document.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-index"));
        currentSettings.customEngines.splice(idx, 1);
        saveAll(); // 刪除後自動儲存
      });
    });
  }
  
  function saveAll() {
    // 取得基本前綴輸入值
    const prefixes = {
      tab: document.querySelector("#prefix-tab").value || "%t",
      bookmark: document.querySelector("#prefix-bookmark").value || "%b",
      history: document.querySelector("#prefix-history").value || "%h",
      search: document.querySelector("#prefix-search").value || "%s"
    };
  
    currentSettings.prefixes = prefixes;
  
    browser.storage.sync.set(currentSettings).then(() => {
      const status = document.querySelector("#status");
      status.style.opacity = "1";
      setTimeout(() => {
        status.style.opacity = "0";
      }, 1500);
      renderEngines(); // 重新渲染以確保畫面同步
    });
  }
  
  // 處理 "Save Settings" 按鈕
  document.querySelector("#save").addEventListener("click", (e) => {
    e.preventDefault();
    saveAll();
  });
  
  // 處理 "Add" 搜尋引擎按鈕
  document.querySelector("#add-engine").addEventListener("click", (e) => {
    e.preventDefault();
    const prefixInput = document.querySelector("#new-prefix");
    const nameInput = document.querySelector("#new-name");
    const urlInput = document.querySelector("#new-url");
  
    const prefix = prefixInput.value.trim();
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
  
    if (prefix && name && url) {
      if (!currentSettings.customEngines) currentSettings.customEngines = [];
      currentSettings.customEngines.push({ prefix, name, url });
      
      // 清空輸入框
      prefixInput.value = "";
      nameInput.value = "";
      urlInput.value = "";
      
      saveAll(); // 新增後自動儲存
    }
  });
  
  document.addEventListener("DOMContentLoaded", restoreOptions);