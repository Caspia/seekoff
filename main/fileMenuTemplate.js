/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow, dialog} = require('electron');
const {readFiles} = require('../lib/elasticReader');
const {INDEX_PREFIX} = require('../lib/constants');
const {client} = require('../lib/elasticClient');
const {getQuestionIdsByTags} = require('../lib/elasticReader');
const mainMsg = require('../main/mainMsg');
const pug = require('pug');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars

const fileMenuTemplate = {
  label: 'File',
  submenu: [
    {
      label: 'Test',
      click: async () => {
        await mainMsg.promiseRenderEvent('doit', 'I am me');
        console.log('Done with File Test menu item');
      },
    },
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
          console.log('Error indexing files: ' + prettyFormat(err));
        }
      },
    },
    {
      label: 'Count tags in file',
      click: async () => {
        const files = dialog.showOpenDialog({
          title: 'Get file to process',
          properties: ['openFile']});
        console.log('File is ' + JSON.stringify(files));
        try {
          const tags = await mainMsg.promiseRenderEvent('getTags', null);
          console.log('tags are ' + prettyFormat(tags));
          await mainMsg.promiseRenderEvent('setbodytext', 'Searching ...');
          const postIds = await getQuestionIdsByTags(files ? files[0] : null, tags);
          console.log('Found ' + postIds.length + ' matching posts');
          await mainMsg.promiseRenderEvent('setbodytext', `Found ${postIds.length} matching posts`);
        } catch (err) {
          console.log('Error getting question ids by tag: ' + prettyFormat(err));
        }
      },
    },
    { role: 'quit' },
  ],
};

module.exports = fileMenuTemplate;
