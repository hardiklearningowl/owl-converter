const { contextBridge, ipcRenderer } = require('electron')

const ALLOWED_SEND = []

const ALLOWED_INVOKE = [
  'settings:get',
  'settings:save',
  'history:get',
  'history:remove',
  'history:clear',
  'dialog:openFiles',
  'dialog:openFolder',
  'queue:get',
  'queue:add',
  'queue:remove',
  'queue:reorder',
  'queue:clearDone',
  'queue:pause',
  'queue:resume',
  'convert:start',
  'convert:startMerge',
  'shell:openPath',
  'update:download',
  'update:install',
  'app:getVersion',
]

const ALLOWED_ON = [
  'queue:updated',
  'convert:mergeProgress',
  'convert:mergeDone',
  'convert:mergeError',
  'update:available',
  'update:download-progress',
  'update:downloaded',
]

contextBridge.exposeInMainWorld('owl', {
  send: (channel, data) => {
    if (!ALLOWED_SEND.includes(channel)) throw new Error(`Blocked channel: ${channel}`)
    ipcRenderer.send(channel, data)
  },
  invoke: (channel, data) => {
    if (!ALLOWED_INVOKE.includes(channel)) throw new Error(`Blocked channel: ${channel}`)
    return ipcRenderer.invoke(channel, data)
  },
  on: (channel, cb) => {
    if (!ALLOWED_ON.includes(channel)) throw new Error(`Blocked channel: ${channel}`)
    const sub = (_e, v) => cb(v)
    ipcRenderer.on(channel, sub)
    return () => ipcRenderer.removeListener(channel, sub)
  },
})
