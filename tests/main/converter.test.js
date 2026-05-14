// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => { if (event === 'close') cb(0) }),
  }))
}))

vi.mock('fs', () => ({
  default: {
    existsSync:    vi.fn(() => true),
    statSync:      vi.fn(() => ({ size: 1024 })),
    writeFileSync: vi.fn(),
    unlinkSync:    vi.fn(),
    mkdirSync:     vi.fn(() => undefined),
    rmSync:        vi.fn(),
  }
}))

const { convertJob } = await import('../../src/main/converter.mjs')

const baseJob = {
  id: '1',
  filePath: 'C:/test.swf',
  outputFolder: 'C:/out',
  resolution: '1080p',
  quality: 'high',
  fps: 'source',
  gpuAcceleration: false,
  watermark: { enabled: false },
}

const baseOpts = {
  swivelPath: 'swivel-cli.exe',
  ffmpegPath: 'ffmpeg.exe',
  onProgress: vi.fn(),
}

describe('convertJob', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('resolves with success=true on happy path', async () => {
    const result = await convertJob(baseJob, baseOpts)
    expect(result).toMatchObject({ success: true })
    expect(result.outPath).toContain('test.mp4')
  })

  it('calls onProgress at least twice (rendering + encoding stages)', async () => {
    await convertJob(baseJob, baseOpts)
    expect(baseOpts.onProgress.mock.calls.length).toBeGreaterThanOrEqual(2)
    const stages = baseOpts.onProgress.mock.calls.map(c => c[0].stage)
    expect(stages).toContain('rendering')
    expect(stages).toContain('encoding')
  })

  it('rejects when swivel exits with non-zero', async () => {
    const { spawn } = await import('child_process')
    spawn.mockImplementationOnce(() => ({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => { if (event === 'close') cb(1) }),
    }))
    await expect(
      convertJob(baseJob, { ...baseOpts })
    ).rejects.toThrow('Swivel failed')
  })

  it('rejects when swivel produces empty output', async () => {
    const fs = await import('fs')
    fs.default.statSync.mockReturnValueOnce({ size: 0 })
    await expect(
      convertJob(baseJob, { ...baseOpts })
    ).rejects.toThrow('empty output')
  })
})
