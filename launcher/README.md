# 小说创作工作台（桌面应用）

一个 Electron 桌面应用，把小说创作工作台的**网页端内嵌在窗口里**，通过分页切换「创作台 / 服务」，双击即用，无需命令行、无需打开外部浏览器。

## 使用

- **便携版 EXE**：双击 `dist\NovelWorkbench-Launcher.exe`（绿色免安装，配置存于 `%APPDATA%\NovelWorkbench\`）。
- **源码运行**：`cd launcher && npm install && npm start`。
- **重新打包 EXE**：`npm run build:win`（产物输出到 `dist\`，需先 `npm install`）。

## 分页

| 页 | 内容 |
|---|---|
| 🕸️ **创作台** | 内嵌网页端（`<webview>` 加载 `http://localhost:3001`），即元素库 / 情节板 / 创作台 |
| ⚙️ **服务** | 项目目录、端口、启动/停止、运行日志 |

## 功能

- **启动即用**：启动器启动时**自动拉起后端服务**，服务就绪后自动在「创作台」页加载界面，无需手动点启动
- **一键启动 / 停止**：「服务」页可手动控制 `node server/src/index.js`（默认端口 3001）
- **最近项目下拉**：记录用过的项目目录，可快速切换
- **在外部浏览器打开**：「服务」页备用按钮，可在系统浏览器中打开工作台
- **运行日志** + 状态显示（运行中 / PID / URL，URL 从日志实时解析）
- 关闭启动器会一并停止它拉起的服务进程，避免残留

## 说明

- 默认项目目录自动探测：上次配置 → 启动器上级目录（源码运行时）→ `D:\AIGC\DeepSeekHarness\Library` → 用户主目录。
- 若自动探测不到，点「浏览…」手动选择项目根目录（含 `server/src/index.js` 的那一层）。
- 依赖本机已安装 Node.js（`node` 需在 PATH 中）。

## 文件

| 文件 | 作用 |
|---|---|
| `main.js` | Electron 主进程，窗口 + IPC + 生命周期 |
| `preload.js` | contextBridge 暴露安全 API |
| `harness.js` | 核心控制逻辑（无 Electron 依赖，可单独测试） |
| `renderer/` | 界面（HTML / CSS / JS） |
| `make-icon.js` | 由源 PNG 生成多尺寸 `build/icon.ico` |
| `smoke-test.js` | 冒烟测试：`node smoke-test.js [port]` |
