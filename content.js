// 初始化状态
let isScrolling = false;
let scrollSpeed = 1;
let scrollInterval = null;
let currentElement = null;

// 鼠标移动事件处理
document.addEventListener('mousemove', (e) => {
  if (!isScrolling) return;
  currentElement = e.target;
});

// 鼠标离开事件处理
document.addEventListener('mouseout', (e) => {
  if (!isScrolling) return;
  if (e.target === currentElement) {
    currentElement = null;
  }
});

// 滚动函数
function scroll() {
  if (!currentElement || !isScrolling) return;
  
  // 获取可滚动的父元素
  let scrollableElement = currentElement;
  while (scrollableElement && !isScrollable(scrollableElement)) {
    scrollableElement = scrollableElement.parentElement;
  }
  
  // 如果没有找到可滚动元素，使用document.documentElement
  if (!scrollableElement) {
    scrollableElement = document.documentElement;
  }
  
  // 执行滚动 - 基础速度提高10倍
  scrollableElement.scrollTop += (scrollSpeed * 10);
}

// 检查元素是否可滚动
function isScrollable(element) {
  const style = window.getComputedStyle(element);
  const overflowY = style.getPropertyValue('overflow-y');
  return element.scrollHeight > element.clientHeight && 
         (overflowY === 'auto' || overflowY === 'scroll');
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({isScrolling, speed: scrollSpeed});
    return true;
  }
  
  if (request.action === 'toggleScrolling') {
    isScrolling = request.enabled;
    if (isScrolling) {
      // 启动滚动
      if (!scrollInterval) {
        scrollInterval = setInterval(scroll, 50);
      }
    } else {
      // 停止滚动
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      currentElement = null;
    }
    sendResponse({isScrolling});
    return true;
  }
  
  if (request.action === 'updateSpeed') {
    scrollSpeed = request.speed;
    sendResponse({speed: scrollSpeed});
    return true;
  }
});