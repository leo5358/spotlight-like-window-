// 預設設定
const defaultSettings = {
    prefixes: {
      tab: "%t",
      bookmark: "%b",
      history: "%h",
      search: "%s"
    }
  };
  
  function restoreOptions() {
    browser.storage.sync.get(defaultSettings).then((res) => {
      document.querySelector("#prefix-tab").value = res.prefixes.tab;
      document.querySelector("#prefix-bookmark").value = res.prefixes.bookmark;
      document.querySelector("#prefix-history").value = res.prefixes.history;
      document.querySelector("#prefix-search").value = res.prefixes.search;
    });
  }
  
  function saveOptions(e) {
    e.preventDefault();
    const prefixes = {
      tab: document.querySelector("#prefix-tab").value || "%t",
      bookmark: document.querySelector("#prefix-bookmark").value || "%b",
      history: document.querySelector("#prefix-history").value || "%h",
      search: document.querySelector("#prefix-search").value || "%s"
    };
  
    browser.storage.sync.set({ prefixes }).then(() => {
      const status = document.querySelector("#status");
      status.style.opacity = "1";
      setTimeout(() => {
        status.style.opacity = "0";
      }, 1500);
    });
  }
  
  document.addEventListener("DOMContentLoaded", restoreOptions);
  document.querySelector("#save").addEventListener("click", saveOptions);