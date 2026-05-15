/**
 * Downloads swivel-cli.exe and ffmpeg.exe into ./binaries/
 * Run before build: npm run fetch-binaries
 */
'use strict'

const https    = require('https')
const fs       = require('fs')
const path     = require('path')

const BINARIES_DIR = path.join(__dirname, '..', 'binaries')
fs.mkdirSync(BINARIES_DIR, { recursive: true })

const DOWNLOADS = [
  {
    name: 'swivel-cli.exe',
    // Update this URL after first Swivel GitHub Release is published
    url: 'https://github.com/hardiklearningowl/swivel/releases/latest/download/swivel-cli-windows.zip',
    isZip: true,
    extractFile: 'swivel-cli.exe',
  },
  {
    name: 'ffmpeg.exe',
    // ffmpeg Windows static build (GPL) — update version as needed
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    isZip: true,
    extractFile: 'ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe',
  },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = (u) => https.get(u, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        get(res.headers.location)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${u}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
    get(url)
  })
}

async function run() {
  for (const bin of DOWNLOADS) {
    const dest = path.join(BINARIES_DIR, bin.name)
    if (fs.existsSync(dest)) {
      console.log(`[fetch-binaries] ${bin.name} already exists, skipping`)
      continue
    }
    console.log(`[fetch-binaries] Downloading ${bin.name}...`)
    if (bin.isZip) {
      const zipDest = dest + '.zip'
      await download(bin.url, zipDest)
      const { execSync } = require('child_process')
      // Use tar (available on Windows 10+) to extract
      execSync(`tar -xf "${zipDest}" -C "${BINARIES_DIR}" "${bin.extractFile}"`)
      // Move to top-level binaries/ if nested path
      const extracted = path.join(BINARIES_DIR, ...bin.extractFile.split('/'))
      if (extracted !== dest) {
        fs.renameSync(extracted, dest)
      }
      fs.unlinkSync(zipDest)
    } else {
      await download(bin.url, dest)
    }
    console.log(`[fetch-binaries] ${bin.name} saved.`)
  }
}

run().catch(e => { console.error(e.message); process.exit(1) })
