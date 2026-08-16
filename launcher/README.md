# 小说创作工作台 启动器

一个 Electron 桌面小程序，用来启动 / 停止小说创作工作台的后端服务，并打开浏览器。

## 使用

- **便携版 EXE**：双击 `dist\小说创作工作台-启动器.exe`（绿色免安装，配置存于 `%APPDATA%\NovelWorkbench\`）。
- **源码运行**：`cd launcher && npm install && npm start`。
- **重新打包 EXE**：`npm run build:win`（产物输出到 `dist\`，需先 `npm install`）。

## 功能

- **一键启动**：点「▶ 启动」即在所选项目目录运行 `node server/src/index.js`（默认端口 3001）
- **最近项目下拉**：记录用过的项目目录，可快速切换
- **启动后自动打开浏览器**（可关）
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
