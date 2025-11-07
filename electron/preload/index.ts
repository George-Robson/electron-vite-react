import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximize: (callback: () => void) => ipcRenderer.on('window:maximized', callback),
  onWindowUnmaximize: (callback: () => void) => ipcRenderer.on('window:unmaximized', callback),
  // Existing ipcRenderer methods for compatibility
  on: (...args: Parameters<typeof ipcRenderer.on>) => {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off: (...args: Parameters<typeof ipcRenderer.off>) => {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send: (...args: Parameters<typeof ipcRenderer.send>) => {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  db: {
    listGames: () => ipcRenderer.invoke('db:listGames'),
    listDistinct: (column: 'platform' | 'genre') => ipcRenderer.invoke('db:listDistinct', column),
    insertGame: (game: { title: string; platform: string; genre: string; collection?: string | null }) => ipcRenderer.invoke('db:insertGame', game),
    updateGame: (game: { id: number; title: string; platform: string; genre: string; collection?: string | null }) => ipcRenderer.invoke('db:updateGame', game),
    deleteGame: (id: number) => ipcRenderer.invoke('db:deleteGame', id),
    listCollections: () => ipcRenderer.invoke('db:listCollections'),
    getCollection: (id: number) => ipcRenderer.invoke('db:getCollection', id),
    createCollection: (name: string) => ipcRenderer.invoke('db:createCollection', name),
    addGameToCollection: (collectionId: number, gameId: number) => ipcRenderer.invoke('db:addGameToCollection', collectionId, gameId),
    removeGameFromCollection: (collectionId: number, gameId: number) => ipcRenderer.invoke('db:removeGameFromCollection', collectionId, gameId),
    // Users
    listUsers: () => ipcRenderer.invoke('db:listUsers'),
    createUser: (name: string) => ipcRenderer.invoke('db:createUser', name),
    deleteUser: (id: number) => ipcRenderer.invoke('db:deleteUser', id),
  updateUserAvatar: (id: number, avatar: string | null) => ipcRenderer.invoke('db:updateUserAvatar', id, avatar),
  updateUserAvatarFile: (id: number, dataUrl: string | null) => ipcRenderer.invoke('db:updateUserAvatarFile', id, dataUrl),
  getUserAvatarData: (id: number) => ipcRenderer.invoke('db:getUserAvatarData', id),
    // API Keys
    listApiKeys: (userId?: number) => ipcRenderer.invoke('db:listApiKeys', userId),
    createApiKey: (params: { user: string | number; platform: string; key: string; client_id?: string }) => ipcRenderer.invoke('db:createApiKey', params),
    updateApiKey: (params: { id: number; key?: string; client_id?: string }) => ipcRenderer.invoke('db:updateApiKey', params),
    deleteApiKey: (id: number) => ipcRenderer.invoke('db:deleteApiKey', id),
    listPlatforms: () => ipcRenderer.invoke('db:listPlatforms'),
    seedPlatforms: (names: string[]) => ipcRenderer.invoke('db:seedPlatforms', names),
    setActiveUser: (id: number) => ipcRenderer.invoke('db:setActiveUser', id),
    onActiveUserChanged: (callback: (user: any) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, user: any) => callback(user);
      ipcRenderer.on('active-user-changed', listener);
      return () => ipcRenderer.off('active-user-changed', listener);
    },
    getActiveUser: () => ipcRenderer.invoke('db:getActiveUser'),
    getPath: () => ipcRenderer.invoke('db:getPath'),
  }
  , scan: {
    start: (platform: string) => ipcRenderer.invoke('scan:start', platform),
    cancel: (id: string) => ipcRenderer.invoke('scan:cancel', id),
    list: () => ipcRenderer.invoke('scan:list'),
    onProgress: (cb: (p: any) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: any) => cb(data);
      ipcRenderer.on('scan-progress', listener);
      return () => ipcRenderer.off('scan-progress', listener);
    },
    onComplete: (cb: (r: any) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: any) => cb(data);
      ipcRenderer.on('scan-complete', listener);
      return () => ipcRenderer.off('scan-complete', listener);
    }
  }
});

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)