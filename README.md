# 小说创作工作台

一个本地运行的独立 Web 应用，用于小说创作：**元素库 → 情节板 → 创作台** 三大模块协作，由大语言模型（本地或云 API）辅助撰写正文。

## 界面预览

| 书架 · 小说选择 | 元素库 |
|---|---|
| ![书架](docs/screenshots/01-home.png) | ![元素库](docs/screenshots/02-elements.png) |

| 情节板（节点式画布） | 创作台 |
|---|---|
| ![情节板](docs/screenshots/03-plot.png) | ![创作台](docs/screenshots/04-studio.png) |

| 模型设置 |
|---|
| ![模型设置](docs/screenshots/05-settings.png) |

- **书架**：多部小说的管理入口，支持新建、载入示例、删除。
- **元素库**：左侧按类型（角色 / 场景 / 物品 / 世界观 / 自定义类型）过滤，右侧卡片式管理，支持属性字段与标签。
- **情节板**：左侧「章 → 节 → 场景」大纲树，中间 **React Flow 节点式画布**（章节/场景自动布局与连线），右侧场景详情（目标 / 冲突 / 视角 / 关联元素）。
- **创作台**：左侧自动组装「关联元素 + 情节结构」上下文并可预览，流式生成正文（可停止、重写/续写），右侧草稿编辑器即时写回场景。
- **模型设置**：Ollama / DeepSeek / OpenAI / Claude 多模型配置，支持连通性测试。

## 三大模块

1. **书架 / 小说选择**：管理多部小说，进入某部小说的创作工作区。
2. **元素库**：储存小说中使用的**角色、场景、物品/道具、世界观/设定**，并支持**自定义类型**（自建类别与字段）。
3. **情节板**：以「**章 → 节 → 场景**」三层结构组织剧情；左侧大纲树 + 中间**节点式画布**（React Flow）+ 右侧场景详情；每个场景可编辑目标/冲突/视角并**关联元素**。
4. **创作台**：自动组装「关联元素 + 情节结构」上下文，通过**本地或云 API 的大模型**流式生成正文（支持重写/续写），结果存回对应场景。

## 运行

```bash
# 1. 安装依赖（本沙箱需把 npm 缓存重定向到工作区内）
npm install --cache .npm-cache

# 2. 构建前端（Rollup + Babel，纯 JS 构建，无原生二进制）
npm run build

# 3. 启动（后端 + 静态前端）
npm start
```

打开 **http://localhost:3001** 即可使用（首次可点「载入示例」查看效果）。

### 桌面启动器（推荐）

封装了一个 Electron 桌面启动器，双击即可启动/停止服务并自动打开浏览器，免命令行：

- **便携版 EXE**：`launcher\dist\NovelWorkbench-Launcher.exe`（绿色免安装）
- 源码运行：`cd launcher && npm install && npm start`
- 重新打包：`cd launcher && npm run build:win`（图标来自 `build\icon.ico`，由 `make-icon.js` 生成）

详见 [`launcher/README.md`](launcher/README.md)。

> 说明：默认前端走构建产物由后端统一在 3001 端口提供。源码里也保留了 `client/vite.config.ts` 与 `vite` 脚本，在**无沙箱限制的普通环境**里可 `npm run dev -w client`（Vite，5173 端口，代理 `/api` 到 3001）做热更新开发；本会话的 Windows 沙箱禁止子进程管道，故改用 Rollup+Babel 构建。

## 模型配置

进入「⚙️ 模型设置」，内置四组可编辑的模型：

| 名称 | 协议 | 默认地址 |
|---|---|---|
| Ollama（本地） | OpenAI 兼容 | `http://localhost:11434/v1`（无需 Key） |
| DeepSeek（云） | OpenAI 兼容 | `https://api.deepseek.com/v1`（需 Key） |
| OpenAI（云） | OpenAI 兼容 | `https://api.openai.com/v1`（需 Key） |
| Claude（云） | Anthropic | `https://api.anthropic.com/v1`（需 Key） |

每组可点「测试连接」验证。创作台默认使用「默认模型」，也可临时换模型 / 改温度 / 限制 token。

## 数据存储

- 所有数据以 JSON 文件保存在 `server/data/`（已加入 `.gitignore`）：
  - `index.json`：小说列表
  - `novels/<id>.json`：每部小说的完整内容（元素、章节、场景、正文）
  - `settings.json`：模型配置（含 API Key）

## 持续集成与 Release

`.github/workflows/build.yml` 会在每次推送到 `main` 或 Pull Request 时自动构建，并在推送 `v*` 标签或手动触发时创建 GitHub Release 并附带便携版 EXE 产物：

- 类型检查（非阻断）+ 前端构建（Rollup + Babel）
- 构建启动器 EXE（electron-builder 便携版）
- 每次构建都上传 EXE 工件；打 tag / 手动触发时发布 Release

手动发布 Release：在仓库 Actions 页选择「Build & Release」→「Run workflow」，或在本地执行 `git tag v1.0.0 && git push origin v1.0.0`。

## 项目结构

```
Library/
├─ server/          # Express 后端（JSON 持久化 + LLM 流式接入 + 静态托管）
│  └─ src/
│     ├─ index.js   # 路由（novels / settings / generate / test）
│     ├─ store.js   # JSON 文件读写
│     └─ llm.js     # OpenAI 兼容 + Anthropic 流式驱动
└─ client/          # React + TypeScript 前端
   ├─ build.mjs     # 构建脚本（Babel 预编译 + Rollup 打包）
   └─ src/
      ├─ components/elements/   # 元素库
      ├─ components/plot/       # 情节板（大纲树 / 画布 / 场景详情）
      ├─ components/studio/     # 创作台
      └─ components/settings/   # 模型设置
```
