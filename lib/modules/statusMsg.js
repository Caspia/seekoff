/**
 * Main and Rendered methods to send and receive status messages
 * @file
 */
const {ipcRenderer, BrowserWindow} = require('electron');

/**
 * Send a message to the status bar
 * (use in Main process)
 * @param {String} msg the status message to send
 */
function send (msg) {
  let mainWindowContents = BrowserWindow.fromId(global.mainWindowId).webContents;
  mainWindowContents.send('status', msg);
}

/**
 * Set response to a status message
 * @param {Function(String)} f function to process status message
 */
function onStatus (f) {
  ipcRenderer.on('status', (event, msg) => {
    f(msg);
  });
}

module.exports = {send, onStatus};
