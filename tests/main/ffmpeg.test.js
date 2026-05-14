// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildEncodeArgs, buildMergeArgs, RESOLUTION_MAP, CRF_MAP } from '../../src/main/ffmpeg.js'

describe('buildEncodeArgs', () => {
  const base = {
    input: 'in.mp4',
    output: 'out.mp4',
    resolution: '1080p',
    quality: 'high',
    fps: 'source',
    gpuAcceleration: false,
    watermark: { enabled: false }
  }

  it('includes input and output', () => {
    const args = buildEncodeArgs(base)
    expect(args).toContain('-i')
    expect(args[args.indexOf('-i') + 1]).toBe('in.mp4')
    expect(args[args.length - 1]).toBe('out.mp4')
  })

  it('applies CRF for quality high', () => {
    const args = buildEncodeArgs(base)
    expect(args).toContain('-crf')
    expect(args[args.indexOf('-crf') + 1]).toBe('18')
  })

  it('applies CRF 28 for quality low', () => {
    const args = buildEncodeArgs({ ...base, quality: 'low' })
    expect(args[args.indexOf('-crf') + 1]).toBe('28')
  })

  it('applies resolution scale for 720p', () => {
    const args = buildEncodeArgs({ ...base, resolution: '720p' })
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).toBeGreaterThan(-1)
    expect(args[vfIdx + 1]).toContain('scale=1280:720')
  })

  it('does not add scale filter for original resolution', () => {
    const args = buildEncodeArgs({ ...base, resolution: 'original' })
    expect(args).not.toContain('-vf')
  })

  it('adds watermark overlay when enabled', () => {
    const args = buildEncodeArgs({
      ...base,
      watermark: { enabled: true, imagePath: 'logo.png', position: 'br', opacity: 0.7 }
    })
    const vfIdx = args.indexOf('-vf')
    expect(args[vfIdx + 1]).toContain('overlay')
  })

  it('applies fps override', () => {
    const args = buildEncodeArgs({ ...base, fps: '30' })
    expect(args).toContain('-r')
    expect(args[args.indexOf('-r') + 1]).toBe('30')
  })

  it('does not add -r when fps is source', () => {
    const args = buildEncodeArgs(base)
    expect(args).not.toContain('-r')
  })
})

describe('buildMergeArgs', () => {
  it('uses concat demuxer with list file', () => {
    const args = buildMergeArgs({ listFile: 'list.txt', output: 'merged.mp4' })
    expect(args).toContain('-f')
    expect(args[args.indexOf('-f') + 1]).toBe('concat')
    expect(args[args.length - 1]).toBe('merged.mp4')
  })
})
