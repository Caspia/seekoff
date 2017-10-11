/**
 * Main and Rendered methods to send and receive messages to main html
 * @file
 */
const {ipcRenderer, BrowserWindow} = require('electron');

/**
 * Send a message to the status bar
 * (use in Main process)
 * @param {String} msg the status message to send
 */
function sendStatus (msg) {
  let mainWindowContents = BrowserWindow.fromId(global.mainWindowId).webContents;
  mainWindowContents.send('status', msg);
}

function renderView (viewName, parms) {
  BrowserWindow.fromId(global.mainWindowId).webContents.send('renderview', viewName, parms);
}

/**
 * Send a message to the render process about a menu event
 * (Use in Main process)
 * @param {String} menuName The menu item selected, example 'elastic-ping' 
 */
function fireMenuSelection (menuName) {
  BrowserWindow.fromId(global.mainWindowId).webContents.send('menuselect', menuName);
}

/**
 * Set response to a status message
 * (use in Renderer process)
 * @param {Function(String)} f function to process status message
 */
function onStatus (f) {
  ipcRenderer.on('status', (event, msg) => {
    f(msg);
  });
}

/**
 * Set html in the main body
 * (use in Main process)
 * @param {String} html the inner html to send
 * @param {Function} onReady function callback when dom ready event
 */
function sendBody (html, onReady) {
  const win = BrowserWindow.fromId(global.mainWindowId);
  if (onReady)
    win.webContents.on('dom-ready', onReady);
  win.webContents.send('body', html);
}

/**
 * Set response to a status message
 * (use in Renderer process)
 * @param {Function(String)} f function to process body
 */
function onBody (f) {
  ipcRenderer.on('body', (event, html, onReady) => {
    f(html);
    if (onReady) {
      onReady();
    }
  });
}

module.exports = {sendStatus, onStatus, sendBody, onBody, fireMenuSelection, renderView};
