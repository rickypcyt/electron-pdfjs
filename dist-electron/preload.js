import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    openPdf: () => ipcRenderer.invoke('open-pdf')
});
//# sourceMappingURL=preload.js.map