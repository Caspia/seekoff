/**
 * Main and Rendered methods to send and receive messages to main html
 * @file
 */
const {BrowserWindow, ipcMain} = require('electron');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars

/**
 * Send a message to the status bar
 * (use in Main process)
 * @param {String} msg the status message to send
 */
function sendStatus(msg) {
  let mainWindowContents = BrowserWindow.fromId(global.mainWindowId).webContents;
  mainWindowContents.send('status', msg);
}

function renderView(viewName, parms) {
  BrowserWindow.fromId(global.mainWindowId).webContents.send('renderview', viewName, parms);
}

/**
 * Send a message to the render process about a menu event
 * (Use in Main process)
 * @param {String} menuName The menu item selected, example 'elastic-ping' 
 */
function fireMenuSelection(menuName) {
  BrowserWindow.fromId(global.mainWindowId).webContents.send('menuselect', menuName);
}

/**
 * Set html in the main body
 * (use in Main process)
 * @param {String} html the inner html to send
 * @param {Function} onReady function callback when dom ready event
 */
function sendBody(html, onReady) {
  const win = BrowserWindow.fromId(global.mainWindowId);
  if (onReady) {
    win.webContents.on('dom-ready', onReady);
  }
  win.webContents.send('body', html);
}

/**
 * Send data to the render process for action
 * @param {string} eventName - Name of the event. Return event `${eventName}-response` expected.
 * @param {object} data - Opaque object to send to renderer
 * @return (object} - Opaque object returned from the renderer
 */
async function promiseRenderEvent(eventName, data) {
  return new Promise((resolve, reject) => {
    ipcMain.once(eventName + '-response', (event, result, error) => {
      error ? reject(error) : resolve(result);
    });
    console.log('sending event ' + eventName);
    BrowserWindow.fromId(global.mainWindowId).webContents.send(eventName, data);
  });
}

module.exports = {sendStatus, sendBody, fireMenuSelection, renderView, promiseRenderEvent};
