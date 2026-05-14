'use strict'

const { autoUpdater } = require('electron-updater')
const { ipcMain, app } = require('electron')

function setupUpdater(mainWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    mainWindow.webContents.send('update:available', { version: info.version })
  })

  autoUpdater.on('download-progress', p => {
    mainWindow.webContents.send('update:download-progress', { percent: Math.round(p.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', err => {
    console.error('[updater] error:', err.message)
  })

  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('update:install',  () => autoUpdater.quitAndInstall())

  // Check only in production, every 4 hours
  if (app.isPackaged) {
    autoUpdater.checkForUpdates()
    setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
  }
}

module.exports = { setupUpdater }
