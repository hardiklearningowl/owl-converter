import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: class {
      constructor({ defaults }) { this._data = { ...defaults } }
      get(key) { return this._data[key] }
      set(key, val) { this._data[key] = val }
    }
  }
})

const { createStore } = await import('../../src/main/store.js')

describe('store — settings', () => {
  let store
  beforeEach(() => { store = createStore() })

  it('returns default theme as light', () => {
    expect(store.getSettings().theme).toBe('light')
  })

  it('saves and retrieves settings', () => {
    store.saveSettings({ theme: 'dark' })
    expect(store.getSettings().theme).toBe('dark')
  })

  it('merges partial settings without losing other keys', () => {
    store.saveSettings({ theme: 'dark' })
    store.saveSettings({ resolution: '720p' })
    const s = store.getSettings()
    expect(s.theme).toBe('dark')
    expect(s.resolution).toBe('720p')
  })
})

describe('store — history', () => {
  let store
  beforeEach(() => { store = createStore() })

  it('starts with empty history', () => {
    expect(store.getHistory()).toEqual([])
  })

  it('adds a history record', () => {
    store.addHistory({ id: '1', filename: 'test.swf', date: '2026-05-09', inputSize: 100, outputSize: 80, duration: 30 })
    expect(store.getHistory()).toHaveLength(1)
    expect(store.getHistory()[0].filename).toBe('test.swf')
  })

  it('prepends new records (newest first)', () => {
    store.addHistory({ id: '1', filename: 'a.swf', date: '2026-05-09', inputSize: 1, outputSize: 1, duration: 1 })
    store.addHistory({ id: '2', filename: 'b.swf', date: '2026-05-09', inputSize: 1, outputSize: 1, duration: 1 })
    expect(store.getHistory()[0].filename).toBe('b.swf')
  })

  it('caps history at 100 records', () => {
    for (let i = 0; i < 105; i++) {
      store.addHistory({ id: String(i), filename: `f${i}.swf`, date: '', inputSize: 0, outputSize: 0, duration: 0 })
    }
    expect(store.getHistory()).toHaveLength(100)
  })

  it('removes a history record by id', () => {
    store.addHistory({ id: 'abc', filename: 'test.swf', date: '', inputSize: 0, outputSize: 0, duration: 0 })
    store.removeHistory('abc')
    expect(store.getHistory()).toHaveLength(0)
  })

  it('clears all history', () => {
    store.addHistory({ id: '1', filename: 'a.swf', date: '', inputSize: 0, outputSize: 0, duration: 0 })
    store.clearHistory()
    expect(store.getHistory()).toHaveLength(0)
  })
})
