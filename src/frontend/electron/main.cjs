const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const { readJsonFile, writeJsonFile } = require('./settings.cjs')
const {
  ensureDir,
  listMarkdownFiles,
  getFileTree,
  readMarkdownFile,
  writeMarkdownFile,
  createNote,
  createFolder,
  deleteNote,
} = require('./notesStore.cjs')
const { createNotesWatcher } = require('./notesWatcher.cjs')

const SETTINGS_FILE = 'settings.json'
let mainWindow = null
let notesDir = null
let watcher = null

function getSettingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

async function loadNotesDir() {
  const settingsPath = getSettingsPath()
  const settings = await readJsonFile(settingsPath, {})

  if (settings.notesDir) {
    notesDir = settings.notesDir
  } else {
    notesDir = path.join(app.getPath('documents'), 'SmartNotes')
    await ensureDir(notesDir)
    await writeJsonFile(settingsPath, { notesDir })
  }
}

async function setNotesDir(newDir) {
  notesDir = newDir
  await ensureDir(notesDir)
  await writeJsonFile(getSettingsPath(), { notesDir })
  restartWatcher()
  notifyNotesChanged()
}

function notifyNotesChanged() {
  if (!mainWindow) return
  mainWindow.webContents.send('notes:changed')
}

function restartWatcher() {
  if (!notesDir) return

  const start = async () => {
    if (watcher) {
      await watcher.close()
      watcher = null
    }

    watcher = createNotesWatcher(notesDir, () => notifyNotesChanged())
  }

  // Fire and forget; watcher errors should never crash the app.
  start().catch(() => {})
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = 'http://127.0.0.1:5173'

  if (!app.isPackaged) {
    await mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    await mainWindow.loadFile(indexPath)
  }

  restartWatcher()
}

function setupIpc() {
  ipcMain.handle('notes:getNotesDir', async () => {
    await loadNotesDir()
    return { notesDir }
  })

  ipcMain.handle('notes:selectNotesDir', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { notesDir, canceled: true }
    }

    await setNotesDir(result.filePaths[0])
    return { notesDir }
  })

  ipcMain.handle('notes:list', async () => {
    await loadNotesDir()
    return listMarkdownFiles(notesDir)
  })

  ipcMain.handle('notes:fileTree', async () => {
    await loadNotesDir()
    return getFileTree(notesDir)
  })

  ipcMain.handle('notes:read', async (_event, { name }) => {
    try{

        await loadNotesDir()
        const content = await readMarkdownFile(notesDir, name)
        return { name, content }
    } catch (err) {
        console.error('Error reading note:', err)
        throw err
    }
  })

  ipcMain.handle('notes:write', async (_event, { name, content }) => {
    try{
            
        await loadNotesDir()
        await writeMarkdownFile(notesDir, name, content)
        return { ok: true }
    } catch (err) {
        console.error('Error writing note:', err)
        throw err
    }
  })

  ipcMain.handle('notes:create', async (_event, { folder } = {}) => {
    await loadNotesDir()
    const note = await createNote(notesDir, folder)
    notifyNotesChanged()
    return note
  })

  ipcMain.handle('notes:createFolder', async (_event, { name }) => {
    await loadNotesDir()
    const result = await createFolder(notesDir, name)
    notifyNotesChanged()
    return result
  })

  ipcMain.handle('notes:delete', async (_event, { name }) => {
    await loadNotesDir()
    const result = await deleteNote(notesDir, name)
    notifyNotesChanged()
    return result
  })

  ipcMain.on('app:revealNotesDir', async () => {
    await loadNotesDir()
    try {
      // Best-effort: ensure folder exists before revealing.
      await fs.mkdir(notesDir, { recursive: true })
      shell.openPath(notesDir)
    } catch (err) {
      console.error('Failed to reveal notes directory:', err)
    }
  })
}

app.whenReady().then(async () => {
  await loadNotesDir()
  setupIpc()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  if (watcher) {
    await watcher.close().catch(() => {})
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
