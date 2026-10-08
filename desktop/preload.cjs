const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dshPetBridge', {
  subscribe(callback) {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('pet:update', listener);
    return () => ipcRenderer.removeListener('pet:update', listener);
  },
  action(value) { ipcRenderer.send('pet:action', value); },
  hit(active) { ipcRenderer.send('pet:hit', active); },
});
