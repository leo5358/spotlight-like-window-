let iframe = null;

function handleOutsideClick(e) {
  removeOverlay();
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "TOGGLE_UI") {
    toggleOverlay();
  } else if (message.action === "CLOSE_UI") {
    removeOverlay();
  }
});

function toggleOverlay() {
  if (iframe) {
    removeOverlay();
    return;
  }

  iframe = document.createElement('iframe');
  
  iframe.style.cssText = `
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, 0);
    width: 700px;
    height: 600px;
    border: none;
    z-index: 2147483647; /* 確保在最上層 */
    border-radius: 12px;
    box-shadow: none; 
    background: transparent !important; 
    background-color: transparent !important;
    color-scheme: dark !important; 
    pointer-events: none; /* 預設不擋滑鼠 */
  `;

  iframe.setAttribute("allowtransparency", "true");
  iframe.src = browser.runtime.getURL("spotlight.html");

  iframe.onload = () => {
    iframe.style.pointerEvents = "auto";
    iframe.focus();
    
    setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 100);
  };

  document.body.appendChild(iframe);
}

function removeOverlay() {
  if (iframe) {
    document.removeEventListener("click", handleOutsideClick);
    
    iframe.remove();
    iframe = null;
  }
}