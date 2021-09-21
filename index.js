const { app, BrowserWindow, ipcMain } = require('electron');
const windowStateKeeper = require('electron-window-state');
const child_process = require('child_process');

app.whenReady().then(() => {
    let windowState = windowStateKeeper({
        defaultWidth: 400,
        defaultHeight: 300,
    });
    const win = new BrowserWindow({
        webPreferences: {
            nativeWindowOpen: true,
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        icon: './icon.png',
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
    });
    windowState.manage(win);
    win.loadFile('./temps.html');
    ipcMain.on('ready', (event, arg) => {
        // start collecting temps
        const SENSORS_INTERVAL_MS = 1000 / 10;
        setInterval(() => {
            child_process.execFile('sensors', ['-j'], {}, (err, stdout, stderr) => {
                if(err) {
                    throw err;
                }
                let sensors = JSON.parse(stdout);
                event.sender.send('sensors', {sensors, time: Date.now()});
            });
        }, SENSORS_INTERVAL_MS);
    });
});
