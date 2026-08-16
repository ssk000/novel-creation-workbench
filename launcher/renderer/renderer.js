'use strict';
const $ = (id) => document.getElementById(id);
const basename = (p) => (p || '').split(/[\\/]/).filter(Boolean).pop() || p;

const els = {
  tabWorkbenchBtn: $('tabWorkbenchBtn'),
  tabServerBtn: $('tabServerBtn'),
  tabWorkbench: $('tabWorkbench'),
  tabServer: $('tabServer'),
  wb: $('wb'),
  wbLoading: $('wbLoading'),
  statusPill: $('statusPill'),
  project: $('project'),
  browseBtn: $('browseBtn'),
  dirPath: $('dirPath'),
  port: $('port'),
  startBtn: $('startBtn'),
  stopBtn: $('stopBtn'),
  openBtn: $('openBtn'),
  runtime: $('runtime'),
  rtStatus: $('rtStatus'),
  rtPid: $('rtPid'),
  rtUrl: $('rtUrl'),
  log: $('log'),
  clearLogBtn: $('clearLogBtn'),
};

let current = { running: false, url: null };
let wbUrl = '';

function switchTab(tab) {
  const workbench = tab === 'workbench';
  els.tabWorkbenchBtn.classList.toggle('active', workbench);
  els.tabServerBtn.classList.toggle('active', !workbench);
  els.tabWorkbench.classList.toggle('active', workbench);
  els.tabServer.classList.toggle('active', !workbench);
}

function updateWorkbench(s) {
  const running = !!s.running;
  if (running && s.url) {
    if (wbUrl !== s.url) {
      els.wb.src = s.url;
      wbUrl = s.url;
    }
    els.wbLoading.style.display = 'none';
    els.wb.style.display = '';
  } else {
    els.wb.style.display = 'none';
    wbUrl = '';
    els.wbLoading.style.display = '';
    els.wbLoading.textContent = running
      ? '服务启动中，请稍候…'
      : '服务未启动。请切换到「⚙️ 服务」页，选择项目目录后点击「▶ 启动」。';
  }
}

function renderStatus(s) {
  if (!s) return;
  current = s;
  const running = !!current.running;

  els.statusPill.textContent = running ? '● 运行中' : '○ 已停止';
  els.statusPill.className = 'pill ' + (running ? 'running' : 'stopped');

  els.runtime.classList.toggle('hidden', !running);
  els.startBtn.disabled = running;
  els.stopBtn.disabled = !running;
  els.openBtn.disabled = !(running && current.url);

  if (running) {
    els.rtStatus.textContent = '运行中';
    els.rtPid.textContent = current.pid != null ? current.pid : '—';
    if (current.url) {
      els.rtUrl.textContent = current.url;
      els.rtUrl.href = current.url;
    } else {
      els.rtUrl.textContent = '等待服务就绪…';
      els.rtUrl.removeAttribute('href');
    }
  }

  updateWorkbench(current);

  if (s.log) {
    els.log.textContent = s.log.join('\n');
    els.log.scrollTop = els.log.scrollHeight;
  }
}

function updateDirLine() {
  els.dirPath.textContent = els.project.value || '—';
}

function renderOptions(projects, currentPath) {
  els.project.innerHTML = '';
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.path;
    opt.textContent = p.title || p.path;
    opt.title = p.path;
    els.project.appendChild(opt);
  }
  els.project.value = currentPath;
  updateDirLine();
}

function addOptionAndSelect(path) {
  const title = basename(path);
  let found = null;
  for (const opt of els.project.options) {
    if (opt.value === path) { found = opt; break; }
  }
  if (!found) {
    found = document.createElement('option');
    found.value = path;
    els.project.insertBefore(found, els.project.firstChild);
  }
  found.textContent = title;
  found.title = path;
  els.project.value = path;
  updateDirLine();
}

function collectConfig() {
  return {
    projectDir: els.project.value,
    port: els.port.value ? Number(els.port.value) : null,
  };
}

function persist() {
  window.nw.saveConfig(collectConfig());
}

async function loadProjects() {
  const [projects, def] = await Promise.all([
    window.nw.listProjects(),
    window.nw.defaultProjectDir(),
  ]);
  const paths = new Set(projects.map((p) => p.path));
  let currentPath = def || projects[0]?.path || '';
  if (!paths.has(currentPath)) {
    projects.unshift({ path: currentPath, title: basename(currentPath) || '主目录' });
  }
  if (projects.length === 0) {
    projects.push({ path: currentPath || '.', title: '主目录' });
  }
  renderOptions(projects, currentPath);
}

async function init() {
  const cfg = await window.nw.loadConfig();
  els.port.value = cfg.port || '3001';

  await loadProjects();
  renderStatus(await window.nw.status());
}

els.tabWorkbenchBtn.addEventListener('click', () => switchTab('workbench'));
els.tabServerBtn.addEventListener('click', () => switchTab('server'));

els.browseBtn.addEventListener('click', async () => {
  const dir = await window.nw.pickFolder();
  if (dir) {
    addOptionAndSelect(dir);
    persist();
    window.nw.recordRecent(dir);
  }
});

els.project.addEventListener('change', () => {
  updateDirLine();
  persist();
});

els.startBtn.addEventListener('click', async () => {
  const cfg = collectConfig();
  persist();
  els.log.textContent = '正在启动…\n';
  const r = await window.nw.start(cfg);
  if (!r.ok) {
    alert('启动失败：' + (r.error || '未知错误'));
    renderStatus(await window.nw.status());
  }
});

els.stopBtn.addEventListener('click', async () => {
  await window.nw.stop();
  renderStatus(await window.nw.status());
});

els.openBtn.addEventListener('click', () => {
  if (current.url) window.nw.openBrowser(current.url);
});

els.clearLogBtn.addEventListener('click', () => {
  els.log.textContent = '';
});

window.nw.onStatus(renderStatus);

els.port.addEventListener('change', persist);

init();
