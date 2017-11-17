/**
 * template for File Menu definition
 * @file
 */

const {BrowserWindow, dialog} = require('electron');
const {readFiles, indexFromPostIds} = require('../lib/elasticReader');
const {INDEX_PREFIX} = require('../lib/constants');
const {client} = require('../lib/elasticClient');
const {getQuestionIdsByTags} = require('../lib/elasticReader');
const mainMsg = require('../main/mainMsg');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const fs = require('fs-extra');

const indexPrefix = process.env.ELASTIC_INDEX_PREFIX || INDEX_PREFIX;

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
      label: 'Index Directory',
      click: async () => {
        let currentType;

        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: '% Completion indexing ' + currentType,
            valuenow: String(percentDone),
            textresult: `Records Indexed: ${totalHits}, Records processed: ${linesRead}`,
          });
        }

        const files = dialog.showOpenDialog({
          title: 'Get directory to process',
          properties: ['openDirectory']});
        console.log('Directories are ' + JSON.stringify(files));

        // If the directory has a Questions.json file, we will use that
        // to limit indexed posts.
        const questionsPath = path.join(files[0], 'Questions.json');
        const hasQuestions = await fs.exists(questionsPath);
        console.log('Found Questions? ' + hasQuestions);

        if (hasQuestions) {
          // Limit indexing using the questions file. sepost must be first.
          const types = ['sepost', 'secomment', 'seuser', 'sepostlink'];
          for (const type of types) {
            currentType = type;
            console.log('indexing ' + type);
            await indexFromPostIds(questionsPath, client, type, indexPrefix, onProgress);
          }
          await mainMsg.promiseRenderEvent('setbodytext', `Done indexing directory ${files[0]}`);
        } else {
          try {
            await readFiles(files ? files[0] : null, client, indexPrefix);
          } catch (err) {
            console.log('Error indexing files: ' + prettyFormat(err));
          }
        }
        console.log('Done reading files');
      },
    },
    {
      label: 'Count tags in file',
      click: async () => {
        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: '% Completion getting post ids by tag',
            valuenow: String(percentDone),
            textresult: `Total hits: ${totalHits}, Records processed: ${linesRead}`,
          });
        }

        // Ask the user for Posts.xml file to read
        const files = dialog.showOpenDialog({
          title: 'Get file to process',
          properties: ['openFile']});
        try {
          // Ask user for tags.
          const tags = await mainMsg.promiseRenderEvent('getTags', null);

          // Search for question ids matching the tags.
          await mainMsg.promiseRenderEvent('setbodytext', 'Searching ...');
          const postIds = await getQuestionIdsByTags(files ? files[0] : null, tags, onProgress);
          console.log('Found ' + postIds.length + ' matching posts');
          await mainMsg.promiseRenderEvent('setbodytext', `Found ${postIds.length} matching posts`);

          // Write the results to a file in the same directory
          const fileDirectory = path.dirname(files[0]);
          await fs.writeFile(path.join(fileDirectory, 'Questions.json'), JSON.stringify({
            tags,
            postIds,
          }));
        } catch (err) {
          console.log('Error getting question ids by tag: ' + prettyFormat(err));
        }
      },
    },
    { role: 'quit' },
  ],
};

module.exports = fileMenuTemplate;
