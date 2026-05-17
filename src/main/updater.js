'use strict'

const { autoUpdater } = require('electron-updater')
const { ipcMain, app } = require('electron')

function setupUpdater(mainWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    mainWindow.webContents.send('update:available', { version: info.version })
  })

  autoUpdater.on('update-not-available', info => {
    mainWindow.webContents.send('update:checkResult', { upToDate: true, current: app.getVersion() })
  })

  autoUpdater.on('download-progress', p => {
    mainWindow.webContents.send('update:download-progress', { percent: Math.round(p.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', err => {
    console.error('[updater] error:', err.message)
    mainWindow.webContents.send('update:checkResult', { error: err.message })
  })

  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('update:install',  () => autoUpdater.quitAndInstall())
  // Manual recheck — triggered by clicking the version badge in the title bar.
  ipcMain.handle('update:check',    async () => {
    if (!app.isPackaged) return { error: 'Dev build — auto-update disabled' }
    try {
      const r = await autoUpdater.checkForUpdates()
      return { ok: true, version: r?.updateInfo?.version }
    } catch (e) {
      return { error: e.message }
    }
  })

  // Initial check (production only), every-30-minute background interval,
  // and a recheck whenever the user brings the window back to focus.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(err =>
      console.error('[updater] initial check failed:', err.message))
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(err =>
        console.error('[updater] periodic check failed:', err.message))
    }, 30 * 60 * 1000)
    mainWindow.on('focus', () => {
      autoUpdater.checkForUpdates().catch(err =>
        console.error('[updater] focus check failed:', err.message))
    })
  }
}

module.exports = { setupUpdater }
