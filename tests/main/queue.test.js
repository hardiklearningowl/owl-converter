// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { createQueue } from '../../src/main/queue.js'

const makeJob = (id) => ({ id, filePath: `/files/${id}.swf`, status: 'queued' })

describe('queue manager', () => {
  let q
  beforeEach(() => { q = createQueue() })

  it('starts empty', () => {
    expect(q.getJobs()).toHaveLength(0)
  })

  it('adds a job', () => {
    q.add(makeJob('a'))
    expect(q.getJobs()).toHaveLength(1)
    expect(q.getJobs()[0].id).toBe('a')
  })

  it('removes a job by id', () => {
    q.add(makeJob('a'))
    q.remove('a')
    expect(q.getJobs()).toHaveLength(0)
  })

  it('reorders jobs', () => {
    q.add(makeJob('a'))
    q.add(makeJob('b'))
    q.add(makeJob('c'))
    q.reorder(['c', 'a', 'b'])
    expect(q.getJobs().map(j => j.id)).toEqual(['c', 'a', 'b'])
  })

  it('updates job status', () => {
    q.add(makeJob('a'))
    q.updateStatus('a', 'converting', { progress: 50 })
    expect(q.getJobs()[0].status).toBe('converting')
    expect(q.getJobs()[0].progress).toBe(50)
  })

  it('returns next queued job', () => {
    q.add(makeJob('a'))
    q.add(makeJob('b'))
    q.updateStatus('a', 'done')
    expect(q.nextPending()?.id).toBe('b')
  })

  it('returns null when no pending jobs', () => {
    expect(q.nextPending()).toBeNull()
  })

  it('pauses and resumes', () => {
    expect(q.isPaused()).toBe(false)
    q.pause()
    expect(q.isPaused()).toBe(true)
    q.resume()
    expect(q.isPaused()).toBe(false)
  })

  it('clears done jobs', () => {
    q.add(makeJob('a'))
    q.add(makeJob('b'))
    q.updateStatus('a', 'done')
    q.clearDone()
    expect(q.getJobs()).toHaveLength(1)
    expect(q.getJobs()[0].id).toBe('b')
  })

  it('getJobs returns a copy (mutations do not affect internal state)', () => {
    q.add(makeJob('a'))
    const jobs = q.getJobs()
    jobs.push(makeJob('x'))
    expect(q.getJobs()).toHaveLength(1)
  })

  it('serialize/deserialize round-trips jobs', () => {
    q.add(makeJob('a'))
    q.add(makeJob('b'))
    const json = q.serialize()
    const q2 = createQueue()
    q2.deserialize(json)
    expect(q2.getJobs().map(j => j.id)).toEqual(['a', 'b'])
  })

  it('throws when adding a job with no id', () => {
    expect(() => q.add({ filePath: 'x.swf' })).toThrow('add: job must have a non-empty id')
  })

  it('throws when deserializing non-array data', () => {
    expect(() => q.deserialize('null')).toThrow('Queue data must be an array')
    expect(() => q.deserialize('{}')).toThrow('Queue data must be an array')
  })

  it('reorder silently drops unknown ids', () => {
    q.add(makeJob('a'))
    q.add(makeJob('b'))
    q.reorder(['b', 'UNKNOWN', 'a'])
    expect(q.getJobs().map(j => j.id)).toEqual(['b', 'a'])
  })
})
