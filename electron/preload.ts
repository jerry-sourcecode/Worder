import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('Program', {
    ENVMODE: () => ipcRenderer.sendSync('ENVMODE'),
    ProjectRoot: () => ipcRenderer.sendSync('ProjectRoot'),
});

contextBridge.exposeInMainWorld('fs', {
    get: (key?: string) => {
        if (key) return ipcRenderer.sendSync('get', key);
        return ipcRenderer.sendSync('getAll');
    },
    set: (key: string, value: string) => ipcRenderer.sendSync('set', key, value),
    clear: () => ipcRenderer.sendSync('clear'),
});
