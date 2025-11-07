import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { initDatabase, seedIfEmpty, listGames, insertGame, updateGame, deleteGame, listDistinct, listCollections, getCollectionWithGames, createCollection, addGameToCollection, removeGameFromCollection, listUsers, createUser, deleteUser, updateUserAvatar, updateUserAvatarFile, getUserAvatarData, listApiKeys, createApiKey, updateApiKey, deleteApiKey, listPlatforms, seedPlatforms, setActiveUser, getActiveUser, getMeta, setMeta, getDatabaseFilePath } from './db'
import { startScan, cancelScan, listActiveScans } from './scanner/index';
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { update } from './update'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    frame: false,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)

  // Initialize / seed DB after window ready
  initDatabase();

  // JSON-based platform seeding (first run only)
  try {
    const seeded = getMeta('platforms_seeded');
    const platformsFile = path.join(process.env.APP_ROOT!, 'platforms.json');
    if (seeded !== 'true' && fs.existsSync(platformsFile)) {
      const raw = fs.readFileSync(platformsFile, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const names = list.filter(p => typeof p === 'string').map(p => p.trim()).filter(Boolean);
        if (names.length) {
          seedPlatforms(names);
          setMeta('platforms_seeded', 'true');
          console.log('[platforms] seeded from platforms.json');
        }
      }
    }
  } catch (err) {
    console.error('Failed to seed platforms from JSON:', err);
  }

  seedIfEmpty();
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})


app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// IPC handlers for window controls
ipcMain.handle('window:minimize', () => {
  win?.minimize();
});
ipcMain.handle('window:maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});
ipcMain.handle('window:close', () => {
  win?.close();
});
ipcMain.handle('window:isMaximized', () => {
  return win?.isMaximized() ?? false;
});

// Database IPC channels
ipcMain.handle('db:listGames', () => listGames());
ipcMain.handle('db:listDistinct', (_e, column: 'platform' | 'genre') => listDistinct(column));
ipcMain.handle('db:insertGame', (_e, game) => insertGame(game));
ipcMain.handle('db:updateGame', (_e, game) => updateGame(game));
ipcMain.handle('db:deleteGame', (_e, id: number) => { deleteGame(id); return true; });
ipcMain.handle('db:listCollections', () => listCollections());
ipcMain.handle('db:getCollection', (_e, id: number) => getCollectionWithGames(id));
ipcMain.handle('db:createCollection', (_e, name: string) => createCollection(name));
ipcMain.handle('db:addGameToCollection', (_e, collectionId: number, gameId: number) => { addGameToCollection(collectionId, gameId); return true; });
ipcMain.handle('db:removeGameFromCollection', (_e, collectionId: number, gameId: number) => { removeGameFromCollection(collectionId, gameId); return true; });
// Users
ipcMain.handle('db:listUsers', () => listUsers());
ipcMain.handle('db:createUser', (_e, name: string) => createUser(name));
ipcMain.handle('db:deleteUser', (_e, id: number) => { deleteUser(id); return true; });
ipcMain.handle('db:updateUserAvatar', (_e, id: number, avatar: string | null) => updateUserAvatar(id, avatar));
ipcMain.handle('db:updateUserAvatarFile', (_e, id: number, dataUrl: string | null) => updateUserAvatarFile(id, dataUrl));
ipcMain.handle('db:getUserAvatarData', (_e, id: number) => getUserAvatarData(id));
// API Keys
ipcMain.handle('db:listApiKeys', (_e, userId?: number) => listApiKeys(userId));
ipcMain.handle('db:createApiKey', (_e, params) => createApiKey(params));
ipcMain.handle('db:updateApiKey', (_e, params) => updateApiKey(params));
ipcMain.handle('db:deleteApiKey', (_e, id: number) => { deleteApiKey(id); return true; });
// Platforms & meta
ipcMain.handle('db:listPlatforms', () => listPlatforms());
ipcMain.handle('db:seedPlatforms', (_e, names: string[]) => { seedPlatforms(names); return listPlatforms(); });
ipcMain.handle('db:setActiveUser', (_e, id: number) => { 
  const prev = getActiveUser();
  setActiveUser(id); 
  const current = getActiveUser();
  if (win && (!prev || prev.id !== id)) {
    win.webContents.send('active-user-changed', current);
  }
  return true; 
});
ipcMain.handle('db:getActiveUser', () => getActiveUser());
ipcMain.handle('db:getPath', () => getDatabaseFilePath());

// Scanning IPC
ipcMain.handle('scan:start', (_e, platform: string) => {
  return startScan(win, platform);
});
ipcMain.handle('scan:cancel', (_e, id: string) => {
  return cancelScan(id);
});
ipcMain.handle('scan:list', () => listActiveScans());

// Emit maximize/unmaximize events to renderer
app.whenReady().then(() => {
  win?.on('maximize', () => {
    win?.webContents.send('window:maximized');
  });
  win?.on('unmaximize', () => {
    win?.webContents.send('window:unmaximized');
  });
});

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
