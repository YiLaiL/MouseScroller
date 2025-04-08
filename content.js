// 初始化状态
let isScrolling = false,
    scrollSpeed = 1,
    scrollDirection = 'down',
    scrollInterval = null,
    currentElement = null,
    lastScrollTime = 0,
    isHovering = false,
    isExtensionEnabled = false,
    lastScrollDirection = 'down';

// 从存储中恢复设置
chrome.storage.local.get(['scrollSpeed', 'scrollDirection', 'isEnabled'], (result) => {
  if (result.scrollSpeed) scrollSpeed = result.scrollSpeed;
  if (result.scrollDirection) {
    scrollDirection = result.scrollDirection;
    lastScrollDirection = result.scrollDirection; // 同步更新缓存的方向
  }
  // 检查扩展是否应该启用
  if (result.isEnabled === true) {
    isExtensionEnabled = true;
    // 注意：这里不自动设置isScrolling为true，避免自动开始滚动
    // 用户需要通过popup或快捷键明确启动滚动功能
  }
});

// 鼠标移动事件处理
document.addEventListener('mousemove', handleMouseMove);

// 鼠标离开事件处理
document.addEventListener('mouseout', handleMouseOut);

// 已移除键盘快捷键支持

// 集中的停止滚动函数 - 确保所有状态和定时器都被正确清除
function stopScrolling() {
  // 移除事件监听器
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseout', handleMouseOut);
  
  // 确保定时器被清除
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  
  // 重置基本状态变量
  isScrolling = false;
  currentElement = null;
  isHovering = false;
  lastScrollTime = 0;
  
  // 清除可能存在的防抖定时器
  if (window.moveDebounce) {
    clearTimeout(window.moveDebounce);
    window.moveDebounce = null;
  }
  
  console.log('滚动功能已停止');
  
  // 清除所有相关存储状态
  // 彻底重置所有状态
  chrome.storage.local.remove(['isEnabled', 'scrollSpeed', 'scrollDirection']);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseout', handleMouseOut);
}

// 滚动函数 - 使用requestAnimationFrame优化性能和平滑度
function scroll() {
  // 严格的检查：如果扩展被禁用或不处于滚动状态，立即返回并确保停止所有滚动
  //提供即时响应，基于当前脚本运行时的变量状态快速终止滚动流程（由于禁用扩展时未能及时更新变量可能没有及时同步，导致
  // 当启动自动滚屏时禁用扩展会使当前页面保持自动滚动）
  if (!isExtensionEnabled || !isScrolling) {
    stopScrolling();
    return;
  }
  
  // 双重验证全局禁用状态（从浏览器存储获取数据确保与持久化存储的状态一致，从而提高代码的健壮性和可靠性）
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (result.isEnabled === false) {
      isExtensionEnabled = false;
      stopScrolling();
      return;
    }
  });
  // 如果没有当前元素或不处于悬停状态，也返回
  if (!currentElement || !isHovering) return;
  
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
    // 优化的速度计算公式，使低速区域更精细，高速区域更快，最大速度为原来的10倍
    const scrollAmount = scrollSpeed <= 10 
      ? Math.pow(scrollSpeed, 1.5) // 原始公式用于1-10的速度范围
      : Math.pow(10, 1.5) + (scrollSpeed - 10) * Math.pow(10, 1.3) / 9; // 10-100范围的加速公式
    
    // 使用缓存的滚动方向，防止在滚动过程中被修改导致抖动
    // 根据方向执行滚动
    if (lastScrollDirection === 'down') {
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

// 提取事件处理函数以便于移除
function handleMouseMove(e) {
  // 如果扩展被禁用或不处于滚动状态，直接返回
  if (!isExtensionEnabled || !isScrolling) return;
  
  currentElement = e.target;
  isHovering = true;
  
  // 添加防抖，减少不必要的处理
  clearTimeout(window.moveDebounce);
  window.moveDebounce = setTimeout(() => {
    // 200ms内没有移动，确认为悬停状态
    isHovering = true;
  }, 200);
}

function handleMouseOut(e) {
  // 如果扩展被禁用或不处于滚动状态，直接返回
  if (!isExtensionEnabled || !isScrolling) return;
  
  if (e.target === currentElement) {
    currentElement = null;
    isHovering = false;
  }
}

// 监听来自popup的消息 - 增强通信能力和错误处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getStatus') {
      sendResponse({isScrolling, speed: scrollSpeed, direction: scrollDirection});
      return true;
    }
    
    if (request.action === 'toggleScrolling') {
      // 更新扩展启用状态和滚动状态
      isExtensionEnabled = request.enabled;
      
      // 只有当扩展启用时，才设置滚动状态为启用
      if (isExtensionEnabled) {
        isScrolling = true;
        // 启动滚动 - 使用更高的刷新率
        if (!scrollInterval) {
          scrollInterval = setInterval(scroll, 16); // 约60fps
        }
      } else {
        // 如果扩展被禁用，确保停止滚动并清除所有状态
        isScrolling = false;
        stopScrolling();
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
      lastScrollDirection = request.direction; // 同步更新缓存的方向
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

// 页面卸载时清理资源
window.addEventListener('unload', () => {
  stopScrolling();
});

// 添加扩展禁用消息监听
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'extensionDisabled') {
    isExtensionEnabled = false;
    stopScrolling();
  }
});