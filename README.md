# Mouse Scroller 鼠标悬停自动滚动扩展

这是一个浏览器扩展，当启用时，鼠标悬停在页面上一段时间后会自动向下滚动页面。

## 背景
由于在逛b站市集时想快速找到喜欢的手办，使用爬虫频繁发送请求导致市集被禁止访问，鼠标自动滚屏速度不好控制，于是决定开发此插件用于
快速滚屏。当然最后才想起快速滚屏的本质和快速发送请求是一样的还不如调整爬虫爬的间隔，意料之中市集又被禁止访问😓
也许该插件还有其它用途，遂发上来。

## 功能

- 鼠标悬停自动滚动：当鼠标在页面上静止一段时间后，页面会自动向下滚动
- 可调节滚动速度：通过滑块控制滚动速度
- 一键开关：随时启用或禁用自动滚动功能

## 安装方法

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 (chrome://extensions/)
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本仓库文件夹

## 使用方法

1. 点击Chrome工具栏中的扩展图标打开控制面板
2. 使用开关按钮启用或禁用自动滚动功能
3. 使用滑块调整滚动速度
4. 当鼠标在页面上静止约0.2秒后，页面将开始自动滚动
5. 移动鼠标会暂停滚动

## 技术实现

- 使用Chrome扩展API实现浏览器扩展功能
- 使用JavaScript监听鼠标事件和控制页面滚动
- 使用HTML和CSS构建用户界面