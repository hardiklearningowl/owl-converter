'use strict'

const { ipcMain, dialog, shell, app } = require('electron')
const path = require('path')
const { createQueue } = require('./queue')

// Dynamic imports for ESM modules
let storeModule, converterModule

async function getStore() {
  if (!storeModule) storeModule = await import('./store.mjs')
  return storeModule
}

async function getConverter() {
  if (!converterModule) converterModule = await import('./converter.mjs')
  return converterModule
}

// Resolve bundled binary paths
function getBinaries() {
  if (!app.isPackaged) {
    return {
      swivel: 'binaries/swivel-cli.exe',
      ffmpeg: 'binaries/ffmpeg.exe',
    }
  }
  return {
    swivel: path.join(process.resourcesPath, 'binaries', 'swivel-cli.exe'),
    ffmpeg: path.join(process.resourcesPath, 'binaries', 'ffmpeg.exe'),
  }
}

function registerIpc(mainWindow) {
  const queue = createQueue()
  let store = null
  let isRunning = false

  // Lazy-init store (async ESM import)
  async function ensureStore() {
    if (!store) {
      const mod = await getStore()
      store = mod.createStore()
    }
    return store
  }

  // ── Settings ─────────────────────────────────────
  ipcMain.handle('settings:get',  async ()      => { const s = await ensureStore(); return s.getSettings() })
  ipcMain.handle('settings:save', async (_, p)  => { const s = await ensureStore(); return s.saveSettings(p) })

  // ── History ──────────────────────────────────────
  ipcMain.handle('history:get',    async ()     => { const s = await ensureStore(); return s.getHistory() })
  ipcMain.handle('history:remove', async (_, id) => { const s = await ensureStore(); return s.removeHistory(id) })
  ipcMain.handle('history:clear',  async ()     => { const s = await ensureStore(); return s.clearHistory() })

  // ── File dialog ───────────────────────────────────
  ipcMain.handle('dialog:openFiles', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select SWF files',
      filters: [{ name: 'Flash Files', extensions: ['swf'] }],
      properties: ['openFile', 'multiSelections'],
    })
    return filePaths ?? []
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select output folder',
      properties: ['openDirectory'],
    })
    return filePaths?.[0] ?? null
  })

  // ── Queue ─────────────────────────────────────────
  ipcMain.handle('queue:get',       ()       => queue.getJobs())
  ipcMain.handle('queue:add',       (_, jobs) => { jobs.forEach(j => queue.add(j)); return queue.getJobs() })
  ipcMain.handle('queue:remove',    (_, id)  => { queue.remove(id); return queue.getJobs() })
  ipcMain.handle('queue:reorder',   (_, ids) => { queue.reorder(ids); return queue.getJobs() })
  ipcMain.handle('queue:clearDone', ()       => { queue.clearDone(); return queue.getJobs() })
  ipcMain.handle('queue:pause',     ()       => { queue.pause() })
  ipcMain.handle('queue:resume',    ()       => { queue.resume(); processNext() })

  // ── Conversion ────────────────────────────────────
  ipcMain.handle('convert:start', async (_, settings) => {
    isRunning = true
    processNext(settings)
  })

  ipcMain.handle('convert:startMerge', async (_, { jobs, outputFolder, outputName, settings }) => {
    mainWindow.webContents.send('convert:mergeProgress', { stage: 'merging', progress: 0 })
    try {
      const { mergeJobs } = await getConverter()
      const result = await mergeJobs(jobs, {
        ffmpegPath: getBinaries().ffmpeg,
        outputFolder, outputName,
        onProgress: p => mainWindow.webContents.send('convert:mergeProgress', p),
      })
      mainWindow.webContents.send('convert:mergeDone', result)
    } catch (e) {
      mainWindow.webContents.send('convert:mergeError', { error: e.message })
    }
  })

  ipcMain.handle('shell:openPath', (_, p) => shell.openPath(p))

  async function processNext(settings) {
    if (queue.isPaused() || !isRunning) return
    const job = queue.nextPending()
    if (!job) { isRunning = false; return }

    const s = await ensureStore()
    const currentSettings = settings ?? s.getSettings()

    queue.updateStatus(job.id, 'converting', { progress: 0 })
    mainWindow.webContents.send('queue:updated', queue.getJobs())

    try {
      const { convertJob } = await getConverter()
      const BINARIES = getBinaries()
      const result = await convertJob(
        { ...job, ...currentSettings },
        {
          swivelPath: BINARIES.swivel,
          ffmpegPath: BINARIES.ffmpeg,
          onProgress: ({ stage, progress }) => {
            queue.updateStatus(job.id, 'converting', { progress, stage })
            mainWindow.webContents.send('queue:updated', queue.getJobs())
          },
        }
      )
      queue.updateStatus(job.id, 'done', { outPath: result.outPath, outputSize: result.outputSize })
      await s.addHistory({
        id:         job.id,
        filename:   path.basename(job.filePath),
        date:       new Date().toISOString(),
        inputSize:  0,
        outputSize: result.outputSize,
        duration:   0,
        outPath:    result.outPath,
      })
    } catch (err) {
      queue.updateStatus(job.id, 'error', { error: err.message })
    }

    mainWindow.webContents.send('queue:updated', queue.getJobs())
    processNext(settings)
  }
}

module.exports = { registerIpc }
