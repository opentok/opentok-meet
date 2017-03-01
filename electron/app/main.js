'use strict';

const {
  app,
  BrowserWindow,
  globalShortcut,
  protocol,
// eslint-disable-next-line import/no-extraneous-dependencies
} = require('electron');

const clone = require('lodash/clone');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const windows = new Set();

protocol.registerStandardSchemes(['meet'], { secure: true });

function registerProtocol() {
  protocol.registerHttpProtocol('meet', (req, callback) => {
    const redirectReq = clone(req);

    if (redirectReq.url.indexOf('meet://home') === 0) {
      redirectReq.url = redirectReq.url.replace('meet://home', 'https://meet.tokbox.com');
    } else {
      redirectReq.url = redirectReq.url.replace('meet://', 'https://');
    }

    callback(redirectReq);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', registerProtocol);
const readyPromise = new Promise(resolve => app.on('ready', resolve));

let createWindowCalled = false;

function createWindow(url = 'meet://home') {
  createWindowCalled = true;

  readyPromise.then(() => {
    // Create the browser window.
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
    });

    windows.add(win);

    win.once('ready-to-show', () => win.show());

    // and load the index.html of the app.
    win.loadURL(url);

    // Emitted when the window is closed.
    win.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      windows.delete(win);
    });
  });
}

readyPromise.then(() => {
  globalShortcut.register('CommandOrControl+N', () => createWindow());
});

readyPromise.then(() => {
  if (!createWindowCalled) {
    createWindow();
  }
});

app.on('open-url', (ev, url) => {
  createWindow(url);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.size === 0) {
    createWindow();
  }
});
