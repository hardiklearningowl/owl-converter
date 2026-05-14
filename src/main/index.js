const { app, BrowserWindow } = require('electron')
const path = require('path')

// isDev is set after app is ready, but for window creation we need it early.
// app.isPackaged is available immediately and is the reliable way.
const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 800,
    minHeight: 560,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
