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
  /** Download a file via Electron's native download manager (fast, no blob-in-memory). */
  downloadFile: (url, filename) => ipcRenderer.invoke('download:file', { url, filename }),
  /** Subscribe to the before-close event so the renderer can flush unsynced data. */
  onBeforeClose: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('electron:before-close', handler);
    return () => ipcRenderer.removeListener('electron:before-close', handler);
  },
  /** Tell the main process the flush is done — safe to close now. */
  signalReadyToClose: () => ipcRenderer.send('electron:flush-complete'),
});
