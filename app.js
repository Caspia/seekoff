/**
 * Main startup file
 * @file
 */

const {app, Menu, BrowserWindow} = require('electron');
const fileMenuTemplate = require('./lib/menus/fileMenuTemplate');
const elasticMenuTemplate = require('./lib/menus/elasticMenuTemplate');

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

function onClosed () {
  // dereference the window
  // for multiple windows store them in an array
  mainWindow = null;
}

function createMainWindow () {
  const win = new BrowserWindow({
    width: 600,
    height: 400
  });

  win.loadURL(`file://${__dirname}/main.html`);
  win.on('closed', onClosed);

  global.mainWindowId = win.id;
  console.log('In app.js, mainWindowId is ' + win.id);
  return win;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on('ready', () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([fileMenuTemplate, elasticMenuTemplate]));
  mainWindow = createMainWindow();
});
