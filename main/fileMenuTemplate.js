/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow, dialog} = require('electron');
const {openFile} = require('../lib/dataSources');

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
    {
      label: 'Open File',
      click: () => {
        const files = dialog.showOpenDialog({
          title: 'Get file to process',
          properties: ['openFile']});
        console.log('Files are ' + JSON.stringify(files));
        openFile(files ? files[0] : null);
      }
    },
    { role: 'quit' }
  ]
};

module.exports = fileMenuTemplate;
