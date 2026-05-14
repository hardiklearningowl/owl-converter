import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import QueuePanel from '../../src/renderer/components/QueuePanel/QueuePanel'
import { useQueueStore } from '../../src/renderer/stores/queueStore'

vi.mock('../../src/renderer/stores/queueStore')
vi.mock('../../src/renderer/hooks/useIpc', () => ({ invoke: vi.fn(), useIpcOn: vi.fn() }))

describe('QueuePanel', () => {
  it('shows empty state when no jobs', () => {
    useQueueStore.mockImplementation((sel) => {
      const state = { jobs: [], removeJob: vi.fn(), addFiles: vi.fn() }
      return sel ? sel(state) : state
    })
    render(<QueuePanel />)
    expect(screen.getByText(/No files yet/i)).toBeTruthy()
  })

  it('shows file items when jobs present', () => {
    const jobs = [{ id: '1', filePath: 'C:/test.swf', status: 'queued', progress: 0 }]
    useQueueStore.mockImplementation((sel) => {
      const state = { jobs, removeJob: vi.fn(), addFiles: vi.fn() }
      return sel ? sel(state) : state
    })
    render(<QueuePanel />)
    expect(screen.getByText('test.swf')).toBeTruthy()
  })
})
