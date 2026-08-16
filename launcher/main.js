'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const harness = require('./harness');

// 配置写入可写目录：打包后 __dirname 位于只读的 app.asar 内，必须改到 userData
process.env.NW_LAUNCHER_CONFIG = path.join(app.getPath('userData'), 'launcher-config.json');

const controller = harness.createController();
let win = null;
let autoOpen = true;

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 640,
    minWidth: 620,
    minHeight: 520,
    title: '小说创作工作台 启动器',
    backgroundColor: '#0f141a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    console.log('[NovelWorkbench Launcher] 窗口已就绪');
  });
  win.on('closed', () => { win = null; });
}

// 把控制器状态推送给渲染层；首次解析到 URL 时按需自动打开浏览器
controller.onChange((snapshot, change) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('nw:status', snapshot);
  }
  if (change === 'url' && autoOpen && snapshot.url) {
    shell.openExternal(snapshot.url);
  }
});

ipcMain.handle('nw:listProjects', () => harness.listProjects());
ipcMain.handle('nw:defaultProjectDir', () => harness.defaultProjectDir());
ipcMain.handle('nw:recordRecent', (_e, dir) => harness.recordRecentProject(dir));
ipcMain.handle('nw:loadConfig', () => harness.loadConfig());
ipcMain.handle('nw:saveConfig', (_e, cfg) => harness.saveConfig(cfg));
ipcMain.handle('nw:start', (_e, opts) => {
  autoOpen = !opts || opts.autoOpen !== false;
  const result = controller.start(opts);
  if (result && result.ok && opts && opts.projectDir) {
    harness.recordRecentProject(opts.projectDir);
  }
  return result;
});
ipcMain.handle('nw:stop', () => controller.stop());
ipcMain.handle('nw:status', () => controller.status());
ipcMain.handle('nw:pickFolder', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择小说创作工作台项目目录（含 server 文件夹）',
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('nw:openBrowser', (_e, url) => {
  if (url && /^https?:\/\//i.test(url)) shell.openExternal(url);
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 关闭启动器时一并停止它拉起的服务进程，避免残留
app.on('before-quit', () => controller.killNow());
