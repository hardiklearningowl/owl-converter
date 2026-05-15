/**
 * Downloads swivel-cli bundle and ffmpeg.exe into ./binaries/
 * Run before build: npm run fetch-binaries
 *
 * Swivel ships as a captive-runtime AIR bundle (a directory, not a single exe).
 * The zip contains:  swivel-bundle/swivel-cli.exe  +  runtime DLLs
 * It is extracted into binaries/ so the final path is:
 *   binaries/swivel-bundle/swivel-cli.exe
 */
'use strict'

const https    = require('https')
const fs       = require('fs')
const path     = require('path')
const { execSync } = require('child_process')

const BINARIES_DIR = path.join(__dirname, '..', 'binaries')
fs.mkdirSync(BINARIES_DIR, { recursive: true })

const DOWNLOADS = [
  {
    // Swivel ships as a captive-runtime bundle — a directory with the exe + AIR runtime DLLs.
    // The zip contains a `swivel-bundle/` folder; we extract it straight into binaries/.
    label:     'swivel-bundle',
    url:       'https://github.com/hardiklearningowl/swivel/releases/latest/download/swivel-cli-windows.zip',
    isZip:     true,
    isBundle:  true,                                   // extract full directory, not a single file
    checkFile: path.join(BINARIES_DIR, 'swivel-bundle', 'swivel-cli.exe'),
  },
  {
    label:       'ffmpeg.exe',
    url:         'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    isZip:       true,
    extractFile: 'ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe',
    dest:        path.join(BINARIES_DIR, 'ffmpeg.exe'),
  },
]

/** Follow redirects and stream to dest file. */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get  = (u) => https.get(u, res => {
      if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location); return }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
    get(url)
  })
}

async function run() {
  for (const bin of DOWNLOADS) {
    // ── Bundle (directory) ────────────────────────────────────────────────
    if (bin.isBundle) {
      if (fs.existsSync(bin.checkFile)) {
        console.log(`[fetch-binaries] ${bin.label} already exists, skipping`)
        continue
      }
      console.log(`[fetch-binaries] Downloading ${bin.label}...`)
      const zipDest = path.join(BINARIES_DIR, `${bin.label}.zip`)
      await download(bin.url, zipDest)
      console.log(`[fetch-binaries] Extracting ${bin.label} bundle...`)
      // Extract the entire zip into binaries/ — preserves the swivel-bundle/ directory
      execSync(`tar -xf "${zipDest}" -C "${BINARIES_DIR}"`)
      fs.unlinkSync(zipDest)
      if (!fs.existsSync(bin.checkFile)) {
        throw new Error(`Extraction failed — expected ${bin.checkFile}`)
      }
      console.log(`[fetch-binaries] ${bin.label} bundle ready.`)
      continue
    }

    // ── Single-file extraction ─────────────────────────────────────────────
    const dest = bin.dest
    if (fs.existsSync(dest)) {
      console.log(`[fetch-binaries] ${bin.label} already exists, skipping`)
      continue
    }
    console.log(`[fetch-binaries] Downloading ${bin.label}...`)
    if (bin.isZip) {
      const zipDest = dest + '.zip'
      await download(bin.url, zipDest)
      execSync(`tar -xf "${zipDest}" -C "${BINARIES_DIR}" "${bin.extractFile}"`)
      const extracted = path.join(BINARIES_DIR, ...bin.extractFile.split('/'))
      if (extracted !== dest) fs.renameSync(extracted, dest)
      fs.unlinkSync(zipDest)
    } else {
      await download(bin.url, dest)
    }
    console.log(`[fetch-binaries] ${bin.label} saved.`)
  }
}

run().catch(e => { console.error(e.message); process.exit(1) })
