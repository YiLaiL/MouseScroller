// 获取DOM元素
const defaultSpeed = document.getElementById('default-speed');
const speedValue = document.getElementById('speed-value');
const defaultDirection = document.getElementById('default-direction');
const smoothScroll = document.getElementById('smooth-scroll');
const enableShortcuts = document.getElementById('enable-shortcuts');
const autoStart = document.getElementById('auto-start');
const rememberState = document.getElementById('remember-state');
const saveButton = document.getElementById('save-button');
const saveStatus = document.getElementById('save-status');

// 加载保存的设置
function loadSettings() {
  chrome.storage.local.get({
    // 默认值
    scrollSpeed: 3,
    scrollDirection: 'down',
    smoothScroll: true,
    enableShortcuts: true,
    autoStart: false,
    rememberState: true
  }, (items) => {
    // 更新UI
    defaultSpeed.value = items.scrollSpeed;
    speedValue.textContent = items.scrollSpeed;
    defaultDirection.value = items.scrollDirection;
    smoothScroll.checked = items.smoothScroll;
    enableShortcuts.checked = items.enableShortcuts;
    autoStart.checked = items.autoStart;
    rememberState.checked = items.rememberState;
  });
}

// 保存设置
function saveSettings() {
  chrome.storage.local.set({
    scrollSpeed: parseInt(defaultSpeed.value),
    scrollDirection: defaultDirection.value,
    smoothScroll: smoothScroll.checked,
    enableShortcuts: enableShortcuts.checked,
    autoStart: autoStart.checked,
    rememberState: rememberState.checked
  }, () => {
    // 显示保存成功消息
    saveStatus.classList.add('visible');
    setTimeout(() => {
      saveStatus.classList.remove('visible');
    }, 2000);
  });
}

// 初始化页面
function initOptions() {
  // 加载设置
  loadSettings();
  
  // 监听滑块变化
  defaultSpeed.addEventListener('input', () => {
    speedValue.textContent = defaultSpeed.value;
  });
  
  // 监听保存按钮
  saveButton.addEventListener('click', saveSettings);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initOptions);