const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('RutaCatrachaDesktop', {
  platform: 'windows_exe',
  toggleFullscreen: () => ipcRenderer.send('ruta-catracha-toggle-fullscreen'),
});
