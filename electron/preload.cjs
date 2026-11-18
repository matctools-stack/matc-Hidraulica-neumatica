const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fluidDesktop', {
  isElectron: true,
  platform: process.platform,
  appVersion: '1.0.0',
  syncVault: (payload) => ipcRenderer.invoke('vault:sync', payload),
  exportProjectFile: (filename, content) =>
    ipcRenderer.invoke('vault:exportFile', { filename, content }),
});
