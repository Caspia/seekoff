/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow, dialog} = require('electron');
const {readFiles} = require('../lib/elasticReader');
const {INDEX_PREFIX} = require('../lib/constants');
const {client} = require('../lib/elasticClient');

const fileMenuTemplate = {
  label: 'File',
  submenu: [
    {
      label: 'Toggle DevTools',
      accelerator: 'Alt+CmdOrCtrl+I',
      click: () => {
        BrowserWindow.getFocusedWindow().toggleDevTools();
      },
    },
    {
      label: 'Index Directory',
      click: async () => {
        const files = dialog.showOpenDialog({
          title: 'Get directory to process',
          properties: ['openDirectory']});
        console.log('Directories are ' + JSON.stringify(files));
        try {
          await readFiles(files ? files[0] : null, client, INDEX_PREFIX);
          console.log('Done reading files');
        } catch (err) {
          console.log('Error indexing files: ' + err);
        }
      },
    },
    { role: 'quit' },
  ],
};

module.exports = fileMenuTemplate;
