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
      if (!job?.id) throw new TypeError('add: job must have a non-empty id')
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
      // Note: `status` argument takes precedence over any `status` key in `extra`
      jobs = jobs.map(j => j.id === id ? { ...j, ...extra, status } : j)
    },

    nextPending() {
      return jobs.find(j => j.status === 'queued') ?? null
    },

    clearDone() {
      jobs = jobs.filter(j => j.status !== 'done')
    },

    serialize()       { return JSON.stringify(jobs) },
    deserialize(json) {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) throw new TypeError('Queue data must be an array')
      jobs = parsed
    },
  }
}

module.exports = { createQueue }
