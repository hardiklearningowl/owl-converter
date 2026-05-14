import Store from 'electron-store'

const DEFAULTS = {
  theme: 'light',
  outputFolder: '',
  resolution: '1080p',
  quality: 'high',
  fps: 'source',
  gpuAcceleration: true,
  watermark: {
    enabled: true,
    imagePath: 'default',
    position: 'br',
    opacity: 0.7,
    size: 'medium',
  },
  openFolderWhenDone: false,
  autoUpdate: true,
}

export function createStore() {
  const settingsStore = new Store({ name: 'settings', defaults: { settings: DEFAULTS } })
  const historyStore  = new Store({ name: 'history',  defaults: { records: [] } })

  return {
    getSettings() {
      return settingsStore.get('settings')
    },
    saveSettings(partial) {
      const current = settingsStore.get('settings')
      settingsStore.set('settings', { ...current, ...partial })
    },
    getHistory() {
      return historyStore.get('records')
    },
    addHistory(record) {
      const records = historyStore.get('records')
      const updated = [record, ...records].slice(0, 100)
      historyStore.set('records', updated)
    },
    removeHistory(id) {
      const records = historyStore.get('records')
      historyStore.set('records', records.filter(r => r.id !== id))
    },
    clearHistory() {
      historyStore.set('records', [])
    },
  }
}
