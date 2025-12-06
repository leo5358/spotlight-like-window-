const input = document.querySelector("#input");
const results = document.querySelector("#results");

let tabs = [];
let index = 0;

// 載入 tab 清單
async function updateTabs() {
  tabs = await browser.tabs.query({});
  displayResults(tabs);
}

// 顯示結果
function displayResults(list) {
  results.innerHTML = "";

  list.slice(0, 8).forEach((tab, i) => {
    const li = document.createElement("li");
    li.textContent = tab.title;
    if (i === index) li.classList.add("active");

    li.addEventListener("click", () => activateTab(tab.id));
    results.appendChild(li);
  });
}

function activateTab(tabId) {
  browser.tabs.update(tabId, { active: true });
  window.close();
}

// 搜尋
input.addEventListener("input", () => {
  const q = input.value.toLowerCase();
  const filtered = tabs.filter(t => t.title.toLowerCase().includes(q));
  index = 0;
  displayResults(filtered);
});

// 鍵盤操作
document.addEventListener("keydown", (e) => {
  const items = results.querySelectorAll("li");

  if (e.key === "ArrowDown") {
    index = (index + 1) % items.length;
    displayResults(tabs);
  } else if (e.key === "ArrowUp") {
    index = (index - 1 + items.length) % items.length;
    displayResults(tabs);
  } else if (e.key === "Enter") {
    const filtered = tabs.filter(t =>
      t.title.toLowerCase().includes(input.value.toLowerCase())
    );
    if (filtered[index]) activateTab(filtered[index].id);
  } else if (e.key === "Escape") {
    window.close();
  }
});

// 啟動時載入
updateTabs();
