// 获取DOM元素
const toggleScrolling = document.getElementById('toggle-scrolling');
const scrollSpeed = document.getElementById('scroll-speed');
const speedValue = document.getElementById('speed-value');
const statusText = document.getElementById('status');

// 初始化时获取当前状态
// 带错误处理和重试机制的初始化
function initializePopup() {
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (chrome.runtime.lastError || !tabs.length) {
      console.log('未找到活动标签页');
      updateStatusText(false);
      return;
    }

    // 确保content script已注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });
    } catch (error) {
      console.log('注入content script失败:', error);
    }

    const retrySendMessage = (attempt = 0) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: 'getStatus'},
        (response) => {
          if (chrome.runtime.lastError) {
            if (attempt < 2) {
              setTimeout(() => retrySendMessage(attempt + 1), 500);
            } else {
              console.log('内容脚本未响应:', chrome.runtime.lastError);
              updateStatusText(false);
              toggleScrolling.checked = false;
            }
            return;
          }
          
          if (response) {
            toggleScrolling.checked = response.isScrolling;
            scrollSpeed.value = response.speed;
            speedValue.textContent = response.speed;
            updateStatusText(response.isScrolling);
          } else {
            updateStatusText(false);
            toggleScrolling.checked = false;
          }
        }
      );
    };

    retrySendMessage();
  });
}

// 初始化popup
initializePopup();

// 监听开关变化
toggleScrolling.addEventListener('change', () => {
  const isEnabled = toggleScrolling.checked;
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs.length) {
      toggleScrolling.checked = !isEnabled;
      return;
    }
    
    chrome.tabs.sendMessage(
      tabs[0].id,
      {action: 'toggleScrolling', enabled: isEnabled},
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('通信失败:', chrome.runtime.lastError);
          toggleScrolling.checked = !isEnabled; // 回滚开关状态
          updateStatusText(false);
          return;
        }
        if (response) {
          updateStatusText(response.isScrolling);
        } else {
          toggleScrolling.checked = !isEnabled;
          updateStatusText(false);
        }
      }
    );
  });
});

// 监听速度滑块变化
scrollSpeed.addEventListener('input', () => {
  const speed = parseInt(scrollSpeed.value);
  speedValue.textContent = speed;
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {action: 'updateSpeed', speed: speed},
      (response) => {
        // 可以在这里处理响应
      }
    );
  });
});

// 更新状态文本
function updateStatusText(isScrolling) {
  statusText.textContent = isScrolling ? '滚动功能已启用' : '滚动功能已禁用';
}