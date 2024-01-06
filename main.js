const { app, BrowserWindow, Tray, contextBridge, ipcMain} = require('electron');
const path = require('path');

let smallWindow;
let tray;

class Timer {
    constructor() {
        this.time = 0;
        this.interval = null;
        this.countdown = false;
        this.running = false;
    }

    start() {
        if (this.running) {
            return;
        }

        if (this.countdown) {
            this.interval = setInterval(() => {
                this.time--;
            }, 1000);
        } else {
            this.interval = setInterval(() => {
                this.time++;
            }, 1000);
        }   

        this.running = true;
    }

    stop() {
        clearInterval(this.interval);
        this.running = false;
    }

    reset() {
        this.time = 0;
        this.countdown = false;
        this.stop();
    }

    startAt(time) {
        this.stop();
        this.time = this.parseTimeToSeconds(time);
        if (this.time === 0) {
            return;
        }
        this.interval = setInterval(() => {
            this.time--;
        }, 1000);
        this.countdown = true;
        this.running = true;
    }

    parseTimeToSeconds(timeString) {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            return 0;
        }
        return hours * 3600 + minutes * 60 + seconds;
    }

    getTime() {
        return this.time;
    }

    getTimeString() {
        const hours = Math.floor(this.time / 3600);
        const minutes = Math.floor((this.time % 3600) / 60);
        const seconds = this.time % 60;
        return `${hours  < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

}

app.on('ready', () => {
    const timer = new Timer();
    const iconPath = path.join(__dirname, 'transparent.png');
    tray = new Tray(iconPath);
    tray.setTitle('00:00:00');
    tray.on('click', toggleWindow);

    // Define the small window
    const windowConfig = {
    width: 165,
    height: 60,
    // width: 1000,
    // height: 1000,
    show: false,
    frame: false,
    resizable: false,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
    },
    };
    smallWindow = new BrowserWindow(windowConfig);
    smallWindow.loadFile('smallWindow.html');
    // Hide the small window when it loses focus
    smallWindow.on('blur', () => {
    if (!smallWindow.webContents.isDevToolsOpened()) {
        smallWindow.hide();
    }
    });

    let interval = null;

    ipcMain.on('start', () => {
        timer.start();
        if (interval) {
            clearInterval(interval);
        }
        interval = setInterval(() => {
            tray.setTitle(timer.getTimeString());
        }, 1000);
    });

    ipcMain.on('stop', () => {
        timer.stop();
    });

    ipcMain.on('reset', () => {
        timer.reset();
        tray.setTitle('00:00:00');
    });

    ipcMain.on('startAt', (event, time) => {
        timer.startAt(time);
        if (interval) {
            clearInterval(interval);
        }
        interval = setInterval(() => {
            tray.setTitle(timer.getTimeString());
        }, 1000);
    });

});

function toggleWindow() {
  if (smallWindow.isVisible()) {
    smallWindow.hide();
  } else {
    const position = getWindowPosition();
    smallWindow.setPosition(position.x, position.y, false);
    smallWindow.show();
  }
}

function getWindowPosition() {
  const trayBounds = tray.getBounds();
  const windowBounds = smallWindow.getBounds();
  // Calculate the window position based on the tray position
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height);
  return { x, y };
}