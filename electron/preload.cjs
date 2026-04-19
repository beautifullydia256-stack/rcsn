const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pwezaDesktop', {
  isElectron: true,
  /**
   * @param {{ hashRoute: string; storageKey: string; storageJson: string | null; appUrl?: string }} opts
   */
  printHashRouteToPdf: (opts) => ipcRenderer.invoke('pdf:print-hash-route', opts),
});
