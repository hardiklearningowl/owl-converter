'use strict'

/**
 * In-memory queue state machine for OwlConverter.
 * Persisted externally via serialize/deserialize.
 */
function createQueue() {
  let jobs   = []
  let paused = false

  return {
    getJobs:  () => [...jobs],
    isPaused: () => paused,
    pause:    () => { paused = true },
    resume:   () => { paused = false },

    add(job) {
      jobs.push({ ...job, status: 'queued', progress: 0, error: null })
    },

    remove(id) {
      jobs = jobs.filter(j => j.id !== id)
    },

    reorder(orderedIds) {
      const map = Object.fromEntries(jobs.map(j => [j.id, j]))
      jobs = orderedIds.map(id => map[id]).filter(Boolean)
    },

    updateStatus(id, status, extra = {}) {
      jobs = jobs.map(j => j.id === id ? { ...j, status, ...extra } : j)
    },

    nextPending() {
      return jobs.find(j => j.status === 'queued') ?? null
    },

    clearDone() {
      jobs = jobs.filter(j => j.status !== 'done')
    },

    serialize()       { return JSON.stringify(jobs) },
    deserialize(json) { jobs = JSON.parse(json) },
  }
}

module.exports = { createQueue }
