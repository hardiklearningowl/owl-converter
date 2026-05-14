import { create } from 'zustand'
import { invoke } from '../hooks/useIpc'
import { v4 as uuidv4 } from 'uuid'

export const useQueueStore = create((set) => ({
  jobs:   [],
  mode:   'batch', // 'batch' | 'merge'
  paused: false,

  setMode: (mode) => set({ mode }),
  setJobs: (jobs) => set({ jobs }),

  async loadJobs() {
    const jobs = await invoke('queue:get')
    set({ jobs })
  },

  async addFiles(filePaths) {
    const newJobs = filePaths.map(fp => ({
      id:       uuidv4(),
      filePath: fp,
      status:   'queued',
      progress: 0,
    }))
    const jobs = await invoke('queue:add', newJobs)
    set({ jobs })
  },

  async removeJob(id) {
    const jobs = await invoke('queue:remove', id)
    set({ jobs })
  },

  async reorderJobs(ids) {
    const jobs = await invoke('queue:reorder', ids)
    set({ jobs })
  },

  async clearDone() {
    const jobs = await invoke('queue:clearDone')
    set({ jobs })
  },

  async pause() {
    await invoke('queue:pause')
    set({ paused: true })
  },

  async resume() {
    await invoke('queue:resume')
    set({ paused: false })
  },
}))
