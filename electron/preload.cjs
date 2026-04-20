const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pwezaDesktop', {
  isElectron: true,
  printHashRouteToPdf: (opts) => ipcRenderer.invoke('pdf:print-hash-route', opts),
  htmlContentToPdf: (opts) => ipcRenderer.invoke('pdf:html-content', opts),
  subscribeUpdate: (cb) => {
    const fn = (_event, payload) => cb(payload);
    ipcRenderer.on('update-event', fn);
    return () => ipcRenderer.removeListener('update-event', fn);
  },
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
});
