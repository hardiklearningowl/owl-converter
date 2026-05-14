import { create } from 'zustand'
import { invoke } from '../hooks/useIpc'

export const useSettingsStore = create((set, get) => ({
  settings: null,

  async load() {
    const settings = await invoke('settings:get')
    set({ settings })
    // Apply theme to document
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  },

  async save(partial) {
    // Optimistic local update — merge watermark sub-object deeply if present
    const current = get().settings ?? {}
    const merged = partial.watermark
      ? { ...current, ...partial, watermark: { ...current.watermark, ...partial.watermark } }
      : { ...current, ...partial }
    set({ settings: merged })
    // Persist to main process
    await invoke('settings:save', partial)
    // Apply theme change immediately
    if (partial.theme !== undefined) {
      document.documentElement.classList.toggle('dark', partial.theme === 'dark')
    }
  },
}))
