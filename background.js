// Mouse Scroller 扩展的后台脚本

// 存储活动标签页的状态
let tabStates = {};

// 初始化扩展
function initializeExtension() {
  console.log('Mouse Scroller 扩展已初始化');
  
  // 从存储中加载设置
  chrome.storage.local.get(['scrollSpeed', 'scrollDirection'], (result) => {
    // 确保有默认值
    if (!result.scrollSpeed) {
      chrome.storage.local.set({scrollSpeed: 1});
    }
    if (!result.scrollDirection) {
      chrome.storage.local.set({scrollDirection: 'down'});
    }
  });
}

// 监听扩展安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Mouse Scroller 扩展已安装');
    // 设置默认配置
    chrome.storage.local.set({
      scrollSpeed: 1, // 默认使用最低速度
      scrollDirection: 'down'
    });
  } else if (details.reason === 'update') {
    console.log('Mouse Scroller 扩展已更新');
  }
  
  initializeExtension();
});

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  console.log('浏览器启动，Mouse Scroller 扩展已加载');
  initializeExtension();
});

// 监听标签页更新事件，确保content script在页面刷新后重新注入
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // 可以在这里执行一些标签页更新后的操作
    // 例如重新注入content script或发送初始化消息
  }
});

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 来自content script的消息
  if (sender.tab) {
    const tabId = sender.tab.id;
    
    // 处理content script就绪消息
    if (request.action === 'contentScriptReady') {
      console.log(`Content script在标签页 ${tabId} 中已就绪`);
      // 可以在这里发送初始化消息给content script
      return false; // 不需要异步响应
    }
    
    // 处理滚动状态变化消息
    if (request.action === 'statusChanged') {
      console.log(`标签页 ${tabId} 滚动状态变为: ${request.isScrolling}`);
      // 更新标签页状态
      tabStates[tabId] = tabStates[tabId] || {};
      tabStates[tabId].isScrolling = request.isScrolling;
      
      // 转发消息给popup（如果打开）
      chrome.runtime.sendMessage({action: 'statusChanged', isScrolling: request.isScrolling});
      return false; // 不需要异步响应
    }
    
    // 处理滚动方向变化消息
    if (request.action === 'directionChanged') {
      console.log(`标签页 ${tabId} 滚动方向变为: ${request.scrollDirection}`);
      // 更新标签页状态
      tabStates[tabId] = tabStates[tabId] || {};
      tabStates[tabId].scrollDirection = request.scrollDirection;
      
      // 转发消息给popup（如果打开）
      chrome.runtime.sendMessage({action: 'directionChanged', scrollDirection: request.scrollDirection});
      return false; // 不需要异步响应
    }
  }
  
  // 这里可以处理来自popup的消息
  
  return false; // 不使用异步响应
});

// 监听标签页关闭事件，清理相关状态
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabStates[tabId]) {
    delete tabStates[tabId];
    console.log(`标签页 ${tabId} 已关闭，状态已清理`);
  }
});

// 初始化扩展
initializeExtension();