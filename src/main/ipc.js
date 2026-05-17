'use strict'

const { ipcMain, dialog, shell, app } = require('electron')
const path = require('path')
const fs   = require('fs')
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

// Resolve bundled binary paths.
// Swivel ships as an Adobe AIR captive-runtime bundle (a directory).
// The entry point exe lives inside:  binaries/swivel-bundle/swivel-cli.exe
function getBinaries() {
  if (!app.isPackaged) {
    return {
      swivel: path.join('binaries', 'swivel-bundle', 'swivel-cli.exe'),
      ffmpeg: path.join('binaries', 'ffmpeg.exe'),
    }
  }
  return {
    swivel: path.join(process.resourcesPath, 'binaries', 'swivel-bundle', 'swivel-cli.exe'),
    ffmpeg: path.join(process.resourcesPath, 'binaries', 'ffmpeg.exe'),
  }
}

const QUEUE_PATH = path.join(app.getPath('userData'), 'queue.json')

function persistQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_PATH, queue.serialize(), 'utf-8')
  } catch (e) {
    console.error('Failed to persist queue:', e)
  }
}

function loadQueue(queue) {
  try {
    if (fs.existsSync(QUEUE_PATH)) {
      queue.deserialize(fs.readFileSync(QUEUE_PATH, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to restore queue:', e)
  }
}

function registerIpc(mainWindow) {
  const queue = createQueue()
  loadQueue(queue)
  let store = null
  let isRunning = false
  // Tracks whether the user has clicked Convert at least once in this session.
  // Once true, adding more SWFs auto-resumes processing instead of waiting
  // for another Convert click — matches user expectation that files dropped
  // into a running queue should just keep going.
  let conversionStarted = false

  // Lazy-init store (async ESM import)
  async function ensureStore() {
    if (!store) {
      const mod = await getStore()
      store = mod.createStore()
    }
    return store
  }

  // ── App info ─────────────────────────────────────
  ipcMain.handle('app:getVersion', () => app.getVersion())

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

  ipcMain.handle('dialog:saveMergedMp4', async (_, { defaultPath } = {}) => {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save merged MP4 as…',
      defaultPath: defaultPath || 'merged_output.mp4',
      filters: [{ name: 'MP4 video', extensions: ['mp4'] }],
    })
    if (canceled || !filePath) return null
    return { folder: path.dirname(filePath), name: path.basename(filePath) }
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
  ipcMain.handle('queue:add', (_, jobs) => {
    jobs.forEach(j => queue.add(j))
    const updated = queue.getJobs()
    mainWindow.webContents.send('queue:updated', updated)
    persistQueue(queue)
    // If a conversion was already kicked off in this session, auto-resume
    // processing for the newly added files. Without this, files added after
    // the queue drained sit forever waiting for another Convert click.
    if (conversionStarted && !isRunning && !queue.isPaused() && queue.nextPending()) {
      isRunning = true
      processNext().catch(err => {
        console.error('[ipc] processNext (auto-resume) error:', err)
        isRunning = false
      })
    }
    return updated
  })

  ipcMain.handle('queue:remove', (_, id) => {
    queue.remove(id)
    const updated = queue.getJobs()
    mainWindow.webContents.send('queue:updated', updated)
    persistQueue(queue)
    return updated
  })

  ipcMain.handle('queue:reorder', (_, ids) => {
    queue.reorder(ids)
    const updated = queue.getJobs()
    mainWindow.webContents.send('queue:updated', updated)
    persistQueue(queue)
    return updated
  })

  ipcMain.handle('queue:clearDone', () => {
    queue.clearDone()
    const updated = queue.getJobs()
    mainWindow.webContents.send('queue:updated', updated)
    persistQueue(queue)
    return updated
  })
  ipcMain.handle('queue:pause',     ()       => { queue.pause() })
  ipcMain.handle('queue:resume',    ()       => { queue.resume(); processNext() })

  // ── Conversion ────────────────────────────────────
  ipcMain.handle('convert:start', async (_, { settings } = {}) => {
    conversionStarted = true
    isRunning = true
    processNext(settings).catch(err => {
      console.error('[ipc] processNext error:', err)
      isRunning = false
    })
  })

  ipcMain.handle('convert:startMerge', async (_, { jobs, outputFolder, outputName, settings }) => {
    // Mark all merge jobs as 'converting' so the UI shows progress / spinner.
    const jobIds = jobs.map(j => j.id)
    jobIds.forEach(id => queue.updateStatus(id, 'converting', { progress: 0, stage: 'rendering' }))
    mainWindow.webContents.send('queue:updated', queue.getJobs())
    mainWindow.webContents.send('convert:mergeProgress', { stage: 'merging', progress: 0 })

    const mergeStartTime = Date.now()
    try {
      const { mergeJobs } = await getConverter()
      const result = await mergeJobs(jobs, {
        swivelPath: getBinaries().swivel,
        ffmpegPath:  getBinaries().ffmpeg,
        outputFolder, outputName,
        settings,
        onProgress: p => {
          // Reflect merge progress on every queued job so the user sees motion.
          jobIds.forEach(id => queue.updateStatus(id, 'converting', { progress: p.progress, stage: p.stage }))
          mainWindow.webContents.send('queue:updated', queue.getJobs())
          mainWindow.webContents.send('convert:mergeProgress', p)
        },
      })
      // Mark all source jobs as done; record the merged output once in history.
      jobIds.forEach(id => queue.updateStatus(id, 'done', { outPath: result.outPath }))
      mainWindow.webContents.send('queue:updated', queue.getJobs())
      try {
        const s = await ensureStore()
        await s.addHistory({
          id:         jobIds[0],
          filename:   outputName + ' (merged)',
          date:       new Date().toISOString(),
          filePath:   jobs.map(j => j.filePath).join(' + '),
          inputSize:  jobs.reduce((sum, j) => { try { return sum + fs.statSync(j.filePath).size } catch (_) { return sum } }, 0),
          outputSize: fs.existsSync(result.outPath) ? fs.statSync(result.outPath).size : 0,
          duration:   Date.now() - mergeStartTime,
          outPath:    result.outPath,
        })
      } catch (_) { /* history failure must not break merge */ }
      if (settings?.openFolderWhenDone) shell.openPath(outputFolder)
      mainWindow.webContents.send('convert:mergeDone', result)
    } catch (e) {
      jobIds.forEach(id => queue.updateStatus(id, 'error', { error: e.message }))
      mainWindow.webContents.send('queue:updated', queue.getJobs())
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

    const jobStartTime = Date.now()
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
        filePath:   job.filePath,
        inputSize:  fs.statSync(job.filePath).size,
        outputSize: result.outputSize,
        duration:   Date.now() - jobStartTime,
        outPath:    result.outPath,
      })
      if (currentSettings?.openFolderWhenDone) {
        shell.openPath(currentSettings.outputFolder)
      }
    } catch (err) {
      queue.updateStatus(job.id, 'error', { error: err.message })
    }

    mainWindow.webContents.send('queue:updated', queue.getJobs())
    processNext(settings)
  }
}

module.exports = { registerIpc }
