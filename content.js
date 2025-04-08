// 初始化状态
let isScrolling = false;
let scrollSpeed = 1;
let scrollDirection = 'down'; // 新增：滚动方向控制
let scrollInterval = null;
let currentElement = null;
let lastScrollTime = 0; // 新增：用于平滑滚动的时间控制
let isHovering = false; // 新增：鼠标悬停状态

// 从存储中恢复设置
chrome.storage.local.get(['scrollSpeed', 'scrollDirection'], (result) => {
  if (result.scrollSpeed) scrollSpeed = result.scrollSpeed;
  if (result.scrollDirection) scrollDirection = result.scrollDirection;
});

// 鼠标移动事件处理
document.addEventListener('mousemove', (e) => {
  if (!isScrolling) return;
  currentElement = e.target;
  isHovering = true;
  
  // 添加防抖，减少不必要的处理
  clearTimeout(window.moveDebounce);
  window.moveDebounce = setTimeout(() => {
    // 200ms内没有移动，确认为悬停状态
    isHovering = true;
  }, 200);
});

// 鼠标离开事件处理
document.addEventListener('mouseout', (e) => {
  if (!isScrolling) return;
  if (e.target === currentElement) {
    currentElement = null;
    isHovering = false;
  }
});

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
  // Alt+S 切换滚动状态
  if (e.altKey && e.key === 's') {
    isScrolling = !isScrolling;
    if (isScrolling) {
      if (!scrollInterval) {
        scrollInterval = setInterval(scroll, 16); // 约60fps的刷新率
      }
    } else {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    }
    // 通知popup状态变化
    chrome.runtime.sendMessage({action: 'statusChanged', isScrolling});
  }
  
  // Alt+D 切换滚动方向
  if (e.altKey && e.key === 'd') {
    scrollDirection = scrollDirection === 'down' ? 'up' : 'down';
    chrome.storage.local.set({scrollDirection});
    // 通知popup状态变化
    chrome.runtime.sendMessage({action: 'directionChanged', scrollDirection});
  }
});

// 滚动函数 - 使用requestAnimationFrame优化性能和平滑度
function scroll() {
  if (!currentElement || !isScrolling || !isHovering) return;
  
  const now = performance.now();
  const elapsed = now - lastScrollTime;
  
  // 限制滚动频率，提高平滑度
  if (elapsed > 16) { // 约60fps
    lastScrollTime = now;
    
    // 获取可滚动的父元素
    let scrollableElement = currentElement;
    while (scrollableElement && !isScrollable(scrollableElement)) {
      scrollableElement = scrollableElement.parentElement;
    }
    
    // 如果没有找到可滚动元素，使用document.documentElement
    if (!scrollableElement) {
      scrollableElement = document.documentElement;
    }
    
    // 计算滚动距离 - 使用非线性映射提供更精细的控制
    const scrollAmount = Math.pow(scrollSpeed, 1.5); // 非线性映射
    
    // 根据方向执行滚动
    if (scrollDirection === 'down') {
      scrollableElement.scrollBy({
        top: scrollAmount,
        behavior: 'auto' // 使用auto而不是smooth以避免滞后感
      });
    } else {
      scrollableElement.scrollBy({
        top: -scrollAmount,
        behavior: 'auto'
      });
    }
  }
}

// 检查元素是否可滚动 - 增强检测能力
function isScrollable(element) {
  // 忽略某些不应该滚动的元素
  if (!element || element.nodeType !== 1) return false;
  
  const style = window.getComputedStyle(element);
  const overflowY = style.getPropertyValue('overflow-y');
  const overflowX = style.getPropertyValue('overflow-x');
  
  // 检查垂直滚动
  const isVerticalScrollable = element.scrollHeight > element.clientHeight && 
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
    
  // 也检查水平滚动，为未来可能的水平滚动功能做准备
  const isHorizontalScrollable = element.scrollWidth > element.clientWidth && 
    (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay');
  
  return isVerticalScrollable || isHorizontalScrollable;
}

// 监听来自popup的消息 - 增强通信能力和错误处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getStatus') {
      sendResponse({isScrolling, speed: scrollSpeed, direction: scrollDirection});
      return true;
    }
    
    if (request.action === 'toggleScrolling') {
      isScrolling = request.enabled;
      if (isScrolling) {
        // 启动滚动 - 使用更高的刷新率
        if (!scrollInterval) {
          scrollInterval = setInterval(scroll, 16); // 约60fps
        }
      } else {
        // 停止滚动
        if (scrollInterval) {
          clearInterval(scrollInterval);
          scrollInterval = null;
        }
        currentElement = null;
        isHovering = false;
      }
      sendResponse({isScrolling});
      return true;
    }
    
    if (request.action === 'updateSpeed') {
      scrollSpeed = request.speed;
      // 保存到存储中
      chrome.storage.local.set({scrollSpeed});
      sendResponse({speed: scrollSpeed});
      return true;
    }
    
    if (request.action === 'updateDirection') {
      scrollDirection = request.direction;
      // 保存到存储中
      chrome.storage.local.set({scrollDirection});
      sendResponse({direction: scrollDirection});
      return true;
    }
    
    // 心跳检测 - 用于确认content script是否正常运行
    if (request.action === 'ping') {
      sendResponse({status: 'alive'});
      return true;
    }
  } catch (error) {
    console.error('消息处理错误:', error);
    sendResponse({error: error.message});
    return true;
  }
});

// 初始化时发送就绪消息
chrome.runtime.sendMessage({action: 'contentScriptReady'});