'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nw', {
  listProjects: () => ipcRenderer.invoke('nw:listProjects'),
  defaultProjectDir: () => ipcRenderer.invoke('nw:defaultProjectDir'),
  recordRecent: (dir) => ipcRenderer.invoke('nw:recordRecent', dir),
  loadConfig: () => ipcRenderer.invoke('nw:loadConfig'),
  saveConfig: (cfg) => ipcRenderer.invoke('nw:saveConfig', cfg),
  pickFolder: () => ipcRenderer.invoke('nw:pickFolder'),
  start: (opts) => ipcRenderer.invoke('nw:start', opts),
  stop: () => ipcRenderer.invoke('nw:stop'),
  status: () => ipcRenderer.invoke('nw:status'),
  openBrowser: (url) => ipcRenderer.invoke('nw:openBrowser', url),
  onStatus: (cb) => {
    const listener = (_e, snapshot) => cb(snapshot);
    ipcRenderer.on('nw:status', listener);
    return () => ipcRenderer.removeListener('nw:status', listener);
  },
});
