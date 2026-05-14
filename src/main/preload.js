const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('owl', {
  send:   (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on:     (channel, cb)   => {
    const sub = (_e, v) => cb(v)
    ipcRenderer.on(channel, sub)
    return () => ipcRenderer.removeListener(channel, sub)
  },
})
