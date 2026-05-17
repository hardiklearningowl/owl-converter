import { spawn } from 'child_process'
import fs        from 'fs'
import path      from 'path'
import os        from 'os'
import { buildEncodeArgs, buildMergeArgs } from './ffmpeg.js'

/**
 * Adobe AIR can't write to stderr — swivel-cli's uncaughtErrorHandler logs
 * fatal errors to %APPDATA%\com.newgrounds.swivel.Swivel\Local Store\swivel-cli.log
 * instead. Read the tail of that file to surface the real cause to the user.
 */
function readSwivelLogTail() {
  try {
    const logPath = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'com.newgrounds.swivel.Swivel', 'Local Store', 'swivel-cli.log'
    )
    if (!fs.existsSync(logPath)) return ''
    const text  = fs.readFileSync(logPath, 'utf8')
    const lines = text.split(/\r?\n/).filter(Boolean)
    // Walk back from the end to find the most recent [ERROR] line.
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('[ERROR]')) {
        const errLine   = lines[i]
        const stackLine = (lines[i + 1] && lines[i + 1].startsWith('[STACK]')) ? lines[i + 1] : ''
        return `\n${errLine}${stackLine ? '\n' + stackLine.slice(0, 300) : ''}`
      }
    }
    return ''
  } catch (_) { return '' }
}

/**
 * Spawn a process and wait for it to exit.
 * Rejects on non-zero exit with both the head (where errors typically appear)
 * and tail (progress / final stats) of stderr, so the actual failure reason
 * isn't lost in FFmpeg's progress output.
 *
 * For swivel-cli specifically: stderr is always empty (AIR limitation), so we
 * also read the tail of swivel-cli.log to surface the real Haxe error.
 */
function spawnProcess(bin, args) {
  const isSwivel = /swivel-cli\.exe$/i.test(bin)
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.stdout.on('data', () => {})
    proc.on('error', err => reject(new Error(`Process failed to start: ${err.message}`)))
    proc.on('close', code => {
      if (code === 0) { resolve(); return }
      const head = stderr.slice(0, 600)
      const tail = stderr.length > 1000 ? stderr.slice(-400) : ''
      let   msg  = tail ? `${head}\n...\n${tail}` : head || '(no stderr)'
      if (isSwivel) msg += readSwivelLogTail()
      reject(new Error(`Process failed (exit ${code}): ${msg}`))
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

  // Resolve 'default' watermark sentinel to actual bundled asset path
  const resolvedSettings = { ...job }
  if (resolvedSettings.watermark?.imagePath === 'default') {
    const { app } = await import('electron')
    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', '..', 'assets')
    resolvedSettings.watermark = {
      ...resolvedSettings.watermark,
      imagePath: path.join(resourcesPath, 'watermarks', 'default.png'),
    }
  }

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

    // Stage 2: raw MP4 → final MP4 via FFmpeg.
    // Try GPU first if requested; on encoder-init failure (no nvcuda.dll,
    // no CUDA driver, no NVIDIA GPU, etc.) fall back to libx264 automatically.
    const baseOpts = {
      input:      rawMp4,
      output:     outPath,
      resolution: resolvedSettings.resolution,
      quality:    resolvedSettings.quality,
      fps:        resolvedSettings.fps,
      watermark:  resolvedSettings.watermark,
    }
    try {
      await spawnProcess(ffmpegPath, buildEncodeArgs({ ...baseOpts, gpuAcceleration: resolvedSettings.gpuAcceleration }))
    } catch (e) {
      if (resolvedSettings.gpuAcceleration && /nvcuda\.dll|h264_nvenc|h264_qsv|Cannot load|Error while opening encoder/i.test(e.message)) {
        console.warn('[converter] GPU encoder unavailable, falling back to CPU (libx264):', e.message.slice(0, 200))
        await spawnProcess(ffmpegPath, buildEncodeArgs({ ...baseOpts, gpuAcceleration: false }))
      } else {
        throw e
      }
    }

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
 * Merge multiple SWF files → single MP4.
 * Stage 1: Swivel CLI converts each SWF → raw MP4 in temp dir
 * Stage 2: FFmpeg concat demuxer joins raw MP4s → merged MP4 in temp dir
 * Stage 3: FFmpeg encode pass applies quality/resolution/watermark → final output
 *
 * @param {object[]} jobs - array of { filePath }
 * @param {{ swivelPath, ffmpegPath, outputFolder, outputName, settings, onProgress }} opts
 */
async function mergeJobs(jobs, { swivelPath, ffmpegPath, outputFolder, outputName, settings = {}, onProgress }) {
  const tmpDir     = fs.mkdtempSync(path.join(os.tmpdir(), 'owl-merge-'))
  const listFile   = path.join(tmpDir, 'list.txt')
  const mergedRaw  = path.join(tmpDir, 'merged_raw.mp4')
  const outPath    = path.join(outputFolder, outputName)

  // Resolve 'default' watermark sentinel
  const resolvedSettings = { ...settings }
  if (resolvedSettings.watermark?.imagePath === 'default') {
    const { app } = await import('electron')
    const resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', '..', 'assets')
    resolvedSettings.watermark = {
      ...resolvedSettings.watermark,
      imagePath: path.join(resourcesPath, 'watermarks', 'default.png'),
    }
  }

  try {
    const total = jobs.length

    // Stage 1: Convert each SWF → raw MP4 via Swivel
    const rawMp4s = []
    for (let i = 0; i < jobs.length; i++) {
      const job     = jobs[i]
      const rawMp4  = path.join(tmpDir, `raw_${i}.mp4`)
      const swivelArgs = ['--input', job.filePath, '--output', rawMp4]
      if (resolvedSettings.fps && resolvedSettings.fps !== 'source') {
        swivelArgs.push('--fps', resolvedSettings.fps)
      }
      onProgress?.({ stage: 'rendering', progress: Math.round((i / total) * 40) })
      await spawnProcess(swivelPath, swivelArgs)
        .catch(e => { throw new Error(`Swivel failed on ${job.filePath}: ${e.message}`) })
      if (!fs.existsSync(rawMp4) || fs.statSync(rawMp4).size === 0) {
        throw new Error(`Swivel produced empty output for ${job.filePath}`)
      }
      rawMp4s.push(rawMp4)
    }

    // Stage 2: Concat raw MP4s → merged raw MP4
    onProgress?.({ stage: 'merging', progress: 50 })
    const lines = rawMp4s.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
    fs.writeFileSync(listFile, lines, 'utf8')
    const concatArgs = buildMergeArgs({ listFile, output: mergedRaw })
    await spawnProcess(ffmpegPath, concatArgs)

    // Stage 3: Encode merged MP4 with quality/resolution/watermark → final output
    onProgress?.({ stage: 'encoding', progress: 70 })
    const baseOpts = {
      input:      mergedRaw,
      output:     outPath,
      resolution: resolvedSettings.resolution,
      quality:    resolvedSettings.quality,
      fps:        resolvedSettings.fps,
      watermark:  resolvedSettings.watermark,
    }
    try {
      await spawnProcess(ffmpegPath, buildEncodeArgs({ ...baseOpts, gpuAcceleration: resolvedSettings.gpuAcceleration }))
    } catch (e) {
      if (resolvedSettings.gpuAcceleration && /nvcuda\.dll|h264_nvenc|h264_qsv|Cannot load|Error while opening encoder/i.test(e.message)) {
        console.warn('[converter] GPU encoder unavailable, falling back to CPU (libx264):', e.message.slice(0, 200))
        await spawnProcess(ffmpegPath, buildEncodeArgs({ ...baseOpts, gpuAcceleration: false }))
      } else {
        throw e
      }
    }

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      throw new Error('FFmpeg produced empty merged output')
    }

    onProgress?.({ stage: 'done', progress: 100 })
    return { success: true, outPath }

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}
  }
}

export { convertJob, mergeJobs }
