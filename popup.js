// 获取DOM元素
const toggleScrolling = document.getElementById('toggle-scrolling');
const scrollSpeed = document.getElementById('scroll-speed');
const speedValue = document.getElementById('speed-value');
const statusText = document.getElementById('status');
const directionToggle = document.getElementById('direction-toggle'); // 新增：方向切换按钮
const directionText = document.getElementById('direction-text'); // 新增：方向文本显示

// 状态变量
let currentTabId = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

// 从存储中恢复设置
function loadSavedSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scrollSpeed', 'scrollDirection'], (result) => {
      if (result.scrollSpeed) {
        scrollSpeed.value = result.scrollSpeed;
        speedValue.textContent = result.scrollSpeed;
      }
      
      if (result.scrollDirection) {
        updateDirectionUI(result.scrollDirection);
      }
      
      resolve();
    });
  });
}

// 初始化时获取当前状态 - 增强错误处理和重试机制
async function initializePopup() {
  // 首先加载保存的设置
  await loadSavedSettings();
  
  // 然后查询当前标签页
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (chrome.runtime.lastError || !tabs.length) {
      console.log('未找到活动标签页');
      updateStatusText(false);
      showErrorMessage('无法访问当前标签页');
      return;
    }
    
    currentTabId = tabs[0].id;
    
    // 确保content script已注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['content.js']
      });
      console.log('Content script注入成功');
    } catch (error) {
      console.error('注入content script失败:', error);
      showErrorMessage('无法在当前页面上运行扩展');
      updateStatusText(false);
      toggleScrolling.checked = false;
      return;
    }
    
    // 发送ping消息检查content script是否响应
    sendPingMessage();
  });
}

// 发送ping消息检查content script是否响应
function sendPingMessage() {
  connectionAttempts++;
  
  chrome.tabs.sendMessage(
    currentTabId,
    {action: 'ping'},
    (response) => {
      if (chrome.runtime.lastError) {
        console.log('Ping失败:', chrome.runtime.lastError);
        if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
          // 延迟重试
          setTimeout(sendPingMessage, 500);
        } else {
          showErrorMessage('无法连接到页面，请刷新页面后重试');
          updateStatusText(false);
          toggleScrolling.checked = false;
        }
        return;
      }
      
      if (response && response.status === 'alive') {
        console.log('Content script响应成功');
        // 连接成功，获取当前状态
        getContentScriptStatus();
      } else {
        showErrorMessage('连接异常，请刷新页面后重试');
      }
    }
  );
}

// 获取content script的当前状态
function getContentScriptStatus() {
  chrome.tabs.sendMessage(
    currentTabId,
    {action: 'getStatus'},
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('获取状态失败:', chrome.runtime.lastError);
        updateStatusText(false);
        toggleScrolling.checked = false;
        return;
      }
      
      if (response) {
        toggleScrolling.checked = response.isScrolling;
        scrollSpeed.value = response.speed;
        speedValue.textContent = response.speed;
        updateStatusText(response.isScrolling);
        
        if (response.direction) {
          updateDirectionUI(response.direction);
        }
      } else {
        updateStatusText(false);
        toggleScrolling.checked = false;
      }
    }
  );
}

// 初始化popup
initializePopup();

// 监听开关变化 - 增强错误处理
toggleScrolling.addEventListener('change', () => {
  const isEnabled = toggleScrolling.checked;
  
  if (!currentTabId) {
    showErrorMessage('无法访问当前标签页');
    toggleScrolling.checked = !isEnabled;
    return;
  }
  
  // 显示加载状态
  statusText.textContent = '正在更新状态...';
  
  chrome.tabs.sendMessage(
    currentTabId,
    {action: 'toggleScrolling', enabled: isEnabled},
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('通信失败:', chrome.runtime.lastError);
        toggleScrolling.checked = !isEnabled; // 回滚开关状态
        updateStatusText(false);
        showErrorMessage('无法与页面通信，请刷新页面后重试');
        return;
      }
      
      if (response) {
        updateStatusText(response.isScrolling);
      } else {
        toggleScrolling.checked = !isEnabled;
        updateStatusText(false);
        showErrorMessage('操作失败，请刷新页面后重试');
      }
    }
  );
});

// 监听方向切换按钮
directionToggle.addEventListener('click', () => {
  const newDirection = directionText.textContent.includes('向下') ? 'up' : 'down';
  
  if (!currentTabId) {
    showErrorMessage('无法访问当前标签页');
    return;
  }
  
  chrome.tabs.sendMessage(
    currentTabId,
    {action: 'updateDirection', direction: newDirection},
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('通信失败:', chrome.runtime.lastError);
        showErrorMessage('无法与页面通信，请刷新页面后重试');
        return;
      }
      
      if (response && response.direction) {
        updateDirectionUI(response.direction);
      }
    }
  );
});

// 监听速度滑块变化 - 增加防抖和错误处理
let speedUpdateTimeout = null;
scrollSpeed.addEventListener('input', () => {
  const speed = parseInt(scrollSpeed.value);
  speedValue.textContent = speed;
  
  // 保存到本地存储
  chrome.storage.local.set({scrollSpeed: speed});
  
  // 防抖处理，避免频繁发送消息
  clearTimeout(speedUpdateTimeout);
  speedUpdateTimeout = setTimeout(() => {
    if (!currentTabId) return;
    
    chrome.tabs.sendMessage(
      currentTabId,
      {action: 'updateSpeed', speed: speed},
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('更新速度失败:', chrome.runtime.lastError);
          // 这里不显示错误消息，因为这是频繁操作
        }
      }
    );
  }, 100); // 100ms防抖
});

// 更新状态文本 - 增加视觉反馈
function updateStatusText(isScrolling) {
  statusText.textContent = isScrolling ? '滚动功能已启用' : '滚动功能已禁用';
  statusText.style.color = isScrolling ? '#4CAF50' : '#666';
  
  // 更新UI状态
  document.body.classList.toggle('scrolling-active', isScrolling);
}

// 更新方向UI
function updateDirectionUI(direction) {
  directionText.textContent = direction === 'down' ? '向下滚动' : '向上滚动';
  directionToggle.title = direction === 'down' ? '点击切换为向上滚动' : '点击切换为向下滚动';
  directionToggle.classList.toggle('up', direction === 'up');
  directionToggle.classList.toggle('down', direction === 'down');
}

// 显示错误消息
function showErrorMessage(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  } else {
    console.error(message);
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'statusChanged') {
    toggleScrolling.checked = request.isScrolling;
    updateStatusText(request.isScrolling);
  }
  
  if (request.action === 'directionChanged') {
    updateDirectionUI(request.scrollDirection);
  }
  
  if (request.action === 'contentScriptReady') {
    console.log('Content script已就绪');
    // 可以在这里执行一些初始化操作
  }
});