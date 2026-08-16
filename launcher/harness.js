'use strict';
/**
 * 小说创作工作台启动器 —— 核心控制逻辑。
 * 不依赖 Electron，只用 Node 内置模块，可用普通 Node 单独测试。
 * 职责：启动/停止本项目的后端服务（node server/src/index.js），并解析其 URL。
 */
const { spawn, execFile, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_CAP = 500;
const DEFAULT_PORT = 3001;

function stripAnsi(s) {
  return String(s).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

function configPath() {
  return process.env.NW_LAUNCHER_CONFIG || path.join(__dirname, 'launcher-config.json');
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
  return true;
}

/** 判断一个目录是否为小说创作工作台项目根目录（含 server/src/index.js）。 */
function isProjectDir(dir) {
  return !!dir && fs.existsSync(path.join(dir, 'server', 'src', 'index.js'));
}

/** 默认项目目录：上次配置 → 源码上级目录 → 常见位置 → 用户主目录。 */
function defaultProjectDir() {
  const cfg = loadConfig();
  if (isProjectDir(cfg.projectDir)) return cfg.projectDir;

  const parent = path.resolve(__dirname, '..');
  if (isProjectDir(parent)) return parent;

  const candidates = [
    'D:\\AIGC\\DeepSeekHarness\\Library',
    path.join(os.homedir(), 'AIGC', 'DeepSeekHarness', 'Library'),
    path.join(os.homedir(), 'DeepSeekHarness', 'Library'),
  ];
  for (const c of candidates) {
    if (isProjectDir(c)) return c;
  }
  return os.homedir();
}

/** 合并「默认目录 + 最近记录」的项目列表（按 path 去重）。 */
function listProjects() {
  const cfg = loadConfig();
  const out = [];
  const seen = new Set();
  const push = (p) => {
    if (!p || typeof p.path !== 'string' || !p.path) return;
    if (seen.has(p.path)) return;
    seen.add(p.path);
    out.push({ path: p.path, title: p.title || path.basename(p.path) });
  };
  const def = defaultProjectDir();
  push({ path: def, title: path.basename(def) });
  for (const r of Array.isArray(cfg.recentProjects) ? cfg.recentProjects : []) push(r);
  return out;
}

function recordRecentProject(dir, title) {
  if (!dir) return;
  const cfg = loadConfig();
  const recents = Array.isArray(cfg.recentProjects) ? cfg.recentProjects : [];
  cfg.recentProjects = [
    { path: dir, title: title || path.basename(dir), lastUsed: Date.now() },
    ...recents.filter((r) => r && r.path && r.path !== dir),
  ].slice(0, 12);
  saveConfig(cfg);
}

function buildCommand({ projectDir, port }) {
  return {
    command: 'node',
    args: ['server/src/index.js'],
    cwd: projectDir,
    env: { ...process.env, PORT: String(port || DEFAULT_PORT) },
  };
}

function extractUrl(text) {
  const clean = stripAnsi(text);
  const m = clean.match(/https?:\/\/[^\s"'<>`]+/);
  if (!m) return null;
  return m[0].replace(/[.,;:!?)\]}>]+$/, '');
}

function createController() {
  const state = {
    child: null,
    pid: null,
    running: false,
    url: null,
    projectDir: process.cwd(),
    port: DEFAULT_PORT,
    startedAt: null,
    log: [],
  };
  let listeners = [];

  function status() {
    return {
      running: state.running,
      pid: state.pid,
      url: state.url,
      projectDir: state.projectDir,
      port: state.port,
      startedAt: state.startedAt,
      log: state.log,
    };
  }

  let logTimer = null;
  function emit(change) {
    const snap = status();
    for (const fn of listeners) {
      try { fn(snap, change); } catch (_) { /* 忽略回调异常 */ }
    }
  }
  function scheduleLogEmit() {
    if (!state.running) return;
    if (logTimer) return;
    logTimer = setTimeout(() => {
      logTimer = null;
      if (state.running) emit('log');
    }, 150);
  }

  function appendLog(text) {
    const clean = stripAnsi(String(text));
    for (const line of clean.split(/\r?\n/)) {
      state.log.push(line);
    }
    if (state.log.length > LOG_CAP) {
      state.log.splice(0, state.log.length - LOG_CAP);
    }
    scheduleLogEmit();
  }

  function start(opts) {
    if (state.running) return { ok: false, error: '已在运行中，请先停止' };

    const projectDir = (opts && opts.projectDir) || defaultProjectDir();
    const port = opts && opts.port ? Number(opts.port) : DEFAULT_PORT;

    if (!isProjectDir(projectDir)) {
      return { ok: false, error: `所选目录不是小说创作工作台项目（缺少 server/src/index.js）: ${projectDir}` };
    }

    const built = buildCommand({ projectDir, port });
    state.projectDir = projectDir;
    state.port = port;
    state.url = null;
    state.log = [];
    state.startedAt = Date.now();

    let child;
    try {
      child = spawn(built.command, built.args, {
        cwd: built.cwd,
        env: built.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      state.running = false;
      state.pid = null;
      appendLog(`启动失败: ${err.message}`);
      return { ok: false, error: err.message };
    }

    state.child = child;
    state.pid = child.pid;
    state.running = true;

    appendLog(`> ${built.command} ${built.args.join(' ')}`);
    appendLog(`> 工作目录: ${projectDir}`);
    appendLog(`> 端口: ${port}\n`);

    const onChunk = (d) => {
      appendLog(d);
      const u = extractUrl(d);
      if (u && !state.url) {
        state.url = u;
        emit('url');
      }
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', (err) => appendLog(`错误: ${err.message}`));
    child.on('exit', (code, signal) => {
      appendLog(`\n[进程已退出 code=${code} signal=${signal}]`);
      state.running = false;
      state.child = null;
      state.pid = null;
      emit('exit');
    });

    emit('start');
    return { ok: true, pid: child.pid };
  }

  function stop() {
    const pid = state.pid;
    const child = state.child;
    if (!pid && !child) {
      state.running = false;
      return Promise.resolve({ ok: true, alreadyStopped: true });
    }
    appendLog('\n[正在停止进程树...]');
    return new Promise((resolve) => {
      const done = () => {
        state.running = false;
        state.child = null;
        state.pid = null;
        emit('stop');
        resolve({ ok: true });
      };
      if (process.platform === 'win32' && pid) {
        execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {
          setTimeout(done, 300);
        });
      } else {
        if (child) { try { child.kill('SIGTERM'); } catch (_) { /* 忽略 */ } }
        setTimeout(done, 300);
      }
    });
  }

  /** 同步、尽力而为地杀掉进程树（供应用退出时使用）。 */
  function killNow() {
    const pid = state.pid;
    if (process.platform === 'win32' && pid) {
      try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch (_) { /* 忽略 */ }
    }
    if (state.child) { try { state.child.kill(); } catch (_) { /* 忽略 */ } }
    state.running = false;
    state.child = null;
    state.pid = null;
  }

  function onChange(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((f) => f !== fn); };
  }

  return { start, stop, killNow, status, onChange };
}

module.exports = {
  isProjectDir,
  defaultProjectDir,
  listProjects,
  recordRecentProject,
  configPath,
  loadConfig,
  saveConfig,
  buildCommand,
  extractUrl,
  createController,
};
