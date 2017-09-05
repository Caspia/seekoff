/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow} = require('electron');

const fileMenuTemplate = {
  label: 'File',
  submenu: [
    {
      label: 'Toggle DevTools',
      accelerator: 'Alt+CmdOrCtrl+I',
      click: () => {
        BrowserWindow.getFocusedWindow().toggleDevTools();
      }
    },
    { role: 'quit' }
  ]
};

module.exports = fileMenuTemplate;
