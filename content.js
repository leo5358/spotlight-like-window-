let iframe = null;

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
  
  iframe.style.position = 'fixed';
  iframe.style.top = '20%';
  iframe.style.left = '50%';
  iframe.style.transform = 'translate(-50%, 0)';
  iframe.style.width = '700px';
  iframe.style.height = '600px'; 
  iframe.style.border = 'none';
  iframe.style.zIndex = '2147483647';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = 'none'; 
  

  iframe.style.background = "transparent"; 
  iframe.style.backgroundColor = "transparent"; 
  iframe.allowTransparency = "true"; 

  iframe.src = browser.runtime.getURL("spotlight.html");

  document.body.appendChild(iframe);
  iframe.focus();
}

function removeOverlay() {
  if (iframe) {
    iframe.remove();
    iframe = null;
  }
}