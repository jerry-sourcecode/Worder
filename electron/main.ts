import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import {fileURLToPath} from 'node:url';
import Store from 'electron-store';

const store = new Store();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOD: 'debug' | 'release' = 'debug';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.resolve(__dirname, './preload.mjs'),
        },
    });
    if (MOD == 'debug') {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.resolve(__dirname, '../dist/index.html'));
    }
}

app.on('ready', () => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('ENVMODE', (e) => {
    e.returnValue = MOD;
});

ipcMain.on('ProjectRoot', (e) => {
    e.returnValue = path.resolve(__dirname, '../');
});

ipcMain.on('get', (e, key) => {
    e.returnValue = store.get(key);
});

ipcMain.on('set', (e, key, value) => {
    e.returnValue = store.set(key, value);
});

ipcMain.on('getAll', (e) => {
    e.returnValue = store.store;
});

ipcMain.on('clear', (e) => {
    e.returnValue = store.clear();
});
