// @ts-check
'use strict'

const RESOLUTION_MAP = {
  '1080p':    'scale=1920:1080',
  '720p':     'scale=1280:720',
  '480p':     'scale=854:480',
  'original': null,
}

const CRF_MAP = {
  low:      '28',
  medium:   '23',
  high:     '18',
  lossless: '12',
}

const POSITION_MAP = {
  tl: 'overlay=10:10',
  tc: 'overlay=(W-w)/2:10',
  tr: 'overlay=W-w-10:10',
  bl: 'overlay=10:H-h-10',
  bc: 'overlay=(W-w)/2:H-h-10',
  br: 'overlay=W-w-10:H-h-10',
}

const SIZE_MAP = { small: 0.08, medium: 0.14, large: 0.20 }

/**
 * Build FFmpeg args to encode a single MP4 with quality/resolution/watermark.
 * @param {{ input: string, output: string, resolution: string, quality: string, fps: string, gpuAcceleration: boolean, watermark: object }} opts
 * @returns {string[]}
 */
function buildEncodeArgs({ input, output, resolution, quality, fps, gpuAcceleration, watermark }) {
  const args = ['-y', '-i', input]

  // Video codec + quality
  // NVENC and libx264 use different quality control flags. -crf works only
  // on libx264; NVENC needs -rc constqp -qp <n>. Passing -crf to NVENC
  // returns -22 (EINVAL) and the encode fails with "received no packets".
  const qpValue = CRF_MAP[quality] ?? '18'
  if (gpuAcceleration) {
    args.push('-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'constqp', '-qp', qpValue)
  } else {
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', qpValue)
  }

  // Audio
  args.push('-c:a', 'aac', '-b:a', '128k')

  // FPS override
  if (fps && fps !== 'source') {
    args.push('-r', fps)
  }

  const scaleFilter = RESOLUTION_MAP[resolution] ?? null

  // Build vf filter chain (scale + optional watermark overlay)
  const filters = []
  if (scaleFilter) filters.push(scaleFilter)

  if (watermark?.enabled && watermark.imagePath) {
    const sizeRatio = SIZE_MAP[watermark.size ?? 'medium']
    const overlayExpr = POSITION_MAP[watermark.position ?? 'br']
    const opacity = watermark.opacity ?? 0.7

    // Insert watermark input after main input (index 3 = after '-y', '-i', '<input>')
    args.splice(3, 0, '-i', watermark.imagePath)

    // Build filter_complex with proper stream labels
    const mainScale = scaleFilter ? `[0:v]${scaleFilter}[scaled];` : ''
    const mainRef   = scaleFilter ? '[scaled]' : '[0:v]'

    const filterComplex = [
      mainScale,
      `[1:v]scale=iw*${sizeRatio}:-1,`,
      `format=rgba,colorchannelmixer=aa=${opacity}[wm];`,
      `${mainRef}[wm]${overlayExpr},format=yuv420p[out]`,
    ].join('')

    args.push('-filter_complex', filterComplex)
    args.push('-map', '[out]', '-map', '0:a?')
    args.push('-movflags', '+faststart', output)
    return args
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','))
  }

  args.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart', output)
  return args
}

/**
 * Build FFmpeg args to concatenate multiple MP4s using the concat demuxer.
 * @param {{ listFile: string, output: string }} opts
 * @returns {string[]}
 */
function buildMergeArgs({ listFile, output }) {
  return [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    output,
  ]
}

module.exports = { buildEncodeArgs, buildMergeArgs, RESOLUTION_MAP, CRF_MAP }
