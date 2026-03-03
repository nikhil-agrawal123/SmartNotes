const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('smartNotes', {
  getNotesDir: () => ipcRenderer.invoke('notes:getNotesDir'),
  selectNotesDir: () => ipcRenderer.invoke('notes:selectNotesDir'),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  getFileTree: () => ipcRenderer.invoke('notes:fileTree'),
  readNote: (name) => ipcRenderer.invoke('notes:read', { name }),
  writeNote: (name, content) => ipcRenderer.invoke('notes:write', { name, content }),
  createNote: (folder) => ipcRenderer.invoke('notes:create', { folder }),
  createFolder: (name) => ipcRenderer.invoke('notes:createFolder', { name }),
  deleteNote: (name) => ipcRenderer.invoke('notes:delete', { name }),
  onNotesChanged: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('notes:changed', listener)
    return () => ipcRenderer.removeListener('notes:changed', listener)
  },
})
