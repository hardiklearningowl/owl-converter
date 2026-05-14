import { spawn } from 'child_process'
import fs        from 'fs'
import path      from 'path'
import os        from 'os'
import { buildEncodeArgs, buildMergeArgs } from './ffmpeg.js'

/**
 * Spawn a process and wait for it to exit.
 * Rejects with last 200 chars of stderr on non-zero exit.
 */
function spawnProcess(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.stdout.on('data', () => {})
    proc.on('error', err => reject(new Error(`Process failed to start: ${err.message}`)))
    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Process failed (exit ${code}): ${stderr.slice(-200)}`))
    })
  })
}

/**
 * Convert a single SWF job: Swivel CLI → FFmpeg encode.
 * @param {object} job - { id, filePath, outputFolder, resolution, quality, fps, gpuAcceleration, watermark }
 * @param {{ swivelPath: string, ffmpegPath: string, onProgress: function }} opts
 * @returns {Promise<{ success: true, outPath: string, outputSize: number }>}
 */
async function convertJob(job, { swivelPath, ffmpegPath, onProgress }) {
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), `owl-${job.id}-`))
  const rawMp4  = path.join(tmpDir, 'raw.mp4')
  const outName = path.basename(job.filePath, '.swf') + '.mp4'
  const outPath = path.join(job.outputFolder, outName)

  try {
    onProgress?.({ id: job.id, stage: 'rendering', progress: 5 })

    // Stage 1: SWF → raw MP4 via Swivel CLI
    const swivelArgs = ['--input', job.filePath, '--output', rawMp4]
    if (job.fps && job.fps !== 'source') swivelArgs.push('--fps', job.fps)

    await spawnProcess(swivelPath, swivelArgs)
      .catch(e => { throw new Error(`Swivel failed: ${e.message}`) })

    if (!fs.existsSync(rawMp4) || fs.statSync(rawMp4).size === 0) {
      throw new Error('Swivel produced empty output')
    }

    onProgress?.({ id: job.id, stage: 'encoding', progress: 50 })

    // Stage 2: raw MP4 → final MP4 via FFmpeg
    const encodeArgs = buildEncodeArgs({
      input:           rawMp4,
      output:          outPath,
      resolution:      job.resolution,
      quality:         job.quality,
      fps:             job.fps,
      gpuAcceleration: job.gpuAcceleration,
      watermark:       job.watermark,
    })
    await spawnProcess(ffmpegPath, encodeArgs)

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      throw new Error('FFmpeg produced empty output')
    }

    onProgress?.({ id: job.id, stage: 'done', progress: 100 })

    const outputSize = fs.statSync(outPath).size
    return { success: true, outPath, outputSize }

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
  }
}

/**
 * Merge multiple MP4 files → single MP4 using FFmpeg concat demuxer.
 * @param {object[]} jobs - array of { filePath }
 * @param {{ ffmpegPath, outputFolder, outputName, onProgress }} opts
 * @returns {Promise<{ success: true, outPath: string }>}
 */
async function mergeJobs(jobs, { ffmpegPath, outputFolder, outputName, onProgress }) {
  const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'owl-merge-'))
  const listFile = path.join(tmpDir, 'list.txt')
  const outPath  = path.join(outputFolder, outputName)

  try {
    // Write concat list (escape single quotes in paths)
    const lines = jobs.map(j => `file '${j.filePath.replace(/'/g, "'\\''")}'`).join('\n')
    fs.writeFileSync(listFile, lines, 'utf8')

    onProgress?.({ stage: 'merging', progress: 10 })

    const args = buildMergeArgs({ listFile, output: outPath })
    await spawnProcess(ffmpegPath, args)

    onProgress?.({ stage: 'done', progress: 100 })
    return { success: true, outPath }

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
  }
}

export { convertJob, mergeJobs }
