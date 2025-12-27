const input = document.querySelector("#input");
const results = document.querySelector("#results");

let currentList = [];
let selectedIndex = 0;

// 1. 監聽輸入 -> 請求背景搜尋
input.addEventListener("input", async () => {
  const query = input.value;
  selectedIndex = 0;

  if (!query.trim()) {
    renderList([]);
    return;
  }

  // 發送訊息給 background.js，等待結果回傳
  const response = await browser.runtime.sendMessage({ 
    action: "SEARCH_REQUEST", 
    query: query 
  });
  
  if (response && response.results) {
    currentList = response.results.slice(0, 15); // 限制顯示數量
    renderList(currentList);
  }
});

// 2. 渲染列表
function renderList(list) {
  results.innerHTML = "";
  
  if (list.length === 0) {
    // 這裡不顯示 "No results" 以免初始畫面太醜，保持空白即可
    return;
  }

  list.forEach((item, i) => {
    const li = document.createElement("li");
    
    // 建立標籤 span
    const tag = document.createElement("span");
    tag.className = "tag";
    
    if (item.type === "tab") { tag.textContent = "TAB"; tag.classList.add("tag-tab"); }
    else if (item.type === "bookmark") { tag.textContent = "BMK"; tag.classList.add("tag-book"); }
    else if (item.type === "history") { tag.textContent = "HIS"; tag.classList.add("tag-hist"); }
    else if (item.type === "search") { tag.textContent = "WEB"; tag.classList.add("tag-search"); }
    
    // 建立文字 span
    const text = document.createElement("span");
    text.textContent = item.title;
    
    li.appendChild(tag);
    li.appendChild(text);

    li.addEventListener("click", () => triggerExecute(item));
    if (i === selectedIndex) li.classList.add("active");
    
    results.appendChild(li);
  });
}

// 3. 執行動作 -> 請求背景執行
function triggerExecute(item) {
  browser.runtime.sendMessage({ action: "EXECUTE_ITEM", item: item });
  closeSpotlight();
}

function closeSpotlight() {
  browser.runtime.sendMessage({ action: "REQUEST_CLOSE" });
  window.close(); // for popup window mode
}

// 4. 鍵盤導航
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % currentList.length;
    updateSelection();
    e.preventDefault(); // 防止游標移動
  } else if (e.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + currentList.length) % currentList.length;
    updateSelection();
    e.preventDefault();
  } else if (e.key === "Enter") {
    if (currentList[selectedIndex]) {
      triggerExecute(currentList[selectedIndex]);
    }
  } else if (e.key === "Escape") {
    closeSpotlight();
  }
});

function updateSelection() {
  const items = results.querySelectorAll("li");
  items.forEach((item, i) => {
    if (i === selectedIndex) {
      item.classList.add("active");
      item.scrollIntoView({ block: "nearest" }); // 確保選到的項目在視野內
    } else {
      item.classList.remove("active");
    }
  });
}

// 初始聚焦
input.focus();