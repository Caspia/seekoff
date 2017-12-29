/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow, dialog} = require('electron');
const {parameters, preferenceDefaults} = require('../lib/parameters');
const mainMsg = require('../main/mainMsg');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const fs = require('fs-extra');

const appPath = path.join(require('os').homedir(), '.stackoff');
const prefsPath = path.join(appPath, 'prefs.json');

const fileMenuTemplate = {
  label: 'File',
  submenu: [
    {
      label: 'Test',
      click: async () => {
        await mainMsg.promiseRenderEvent(
          'progress',
          {description: 'the bar', valuenow: '90', textresult: 'the result'});
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
      label: 'Set index parameters',
      click: async () => {
        const results = await mainMsg.promiseRenderEvent('setparameters', parameters);
        if (results.button == 'defaults') {
          results.parameters = JSON.parse(JSON.stringify(preferenceDefaults));
          console.log('parameters\n' + prettyFormat(preferenceDefaults));
        }
        if (results.button != 'cancel') {
          for (const key in results.parameters) parameters[key] = results.parameters[key];
          if (!(await fs.exists(appPath))) {
            await fs.mkdir(appPath);
          }
          await fs.writeFile(prefsPath, JSON.stringify(parameters));
        }
      },
    },
    { role: 'quit' },
  ],
};

module.exports = fileMenuTemplate;
