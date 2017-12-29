/**
 * template for File Menu definition
 * @file
 */

const {dialog} = require('electron');
const {readFiles, indexFromPostIds, extendAnswersFromQuestions} = require('../lib/elasticReader');
const {parameters} = require('../lib/parameters');
const {client} = require('../lib/elasticClient');
const {getQuestionIdsByTags, getAllPostIds} = require('../lib/elasticReader');
const mainMsg = require('../main/mainMsg');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const fs = require('fs-extra');

const appPath = path.join(require('os').homedir(), '.stackoff');
const prefsPath = path.join(appPath, 'prefs.json');

const indexMenuTemplate = {
  label: 'Index',
  submenu: [
    {
      label: 'Step 1: Make Questions.json from tags',
      click: async () => {
        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone, progressDescription) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: progressDescription || '% Completion getting question ids by tag',
            valuenow: String(percentDone),
            textresult: `Total hits: ${totalHits}, Records processed: ${linesRead}`,
          });
        }

        // Ask the user for Posts.xml file to read
        const files = dialog.showOpenDialog({
          title: 'Get Posts.xml file to process',
          properties: ['openFile']});
        try {
          // Search for question ids matching the tags.
          await mainMsg.promiseRenderEvent('setbodytext', 'Searching ...');
          // Store the selected directory in parameters
          if (files && files[0]) {
            const fileDirectory = path.dirname(files[0]);
            parameters.xmlFilePath = fileDirectory;
            if (!(await fs.exists(appPath))) {
              await fs.mkdir(appPath);
            }
            await fs.writeFile(prefsPath, JSON.stringify(parameters));
            const postIds = await getQuestionIdsByTags(files[0], null, onProgress);
            console.log('Found ' + postIds.length + ' matching posts');
            await mainMsg.promiseRenderEvent('setbodytext', `Found ${postIds.length} matching posts`);

            // Write the results to a file in the same directory
            await fs.writeFile(path.join(fileDirectory, 'Questions.json'), JSON.stringify({
              tagsToInclude: parameters.tagsToInclude,
              tagsToExclude: parameters.tagsToExclude,
              postIds,
            }));
          }
        } catch (err) {
          console.log('Error getting question ids by tag: ' + prettyFormat(err));
        }
      },
    },
    {
      label: 'Step 2: Make PostIds.json from Questions',
      click: async () => {
        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone, progressDescription) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: progressDescription || '% Questions processed ',
            valuenow: String(percentDone),
            textresult: `Records Indexed: ${totalHits}, Records processed: ${linesRead}`,
          });
        }

        // Ask the user for Questions.json file to read
        const files = dialog.showOpenDialog({
          title: 'Get Questions.json file to process',
          properties: ['openFile']});
        try {
          const [postIds, documentCount, questionIds] = await getAllPostIds(files ? files[0] : null, onProgress);
          await mainMsg.promiseRenderEvent('setbodytext', `Added ${documentCount} matching posts`);

          // Write the results to a file in the same directory
          const fileDirectory = path.dirname(files[0]);
          const postIdsArray = Array.from(postIds);
          await fs.writeFile(
            path.join(fileDirectory, 'PostIds.json'),
            JSON.stringify(postIdsArray)
          );
          const extendedQuestionIdsArray = Array.from(questionIds);
          await fs.writeFile(
            path.join(fileDirectory, 'ExtendedQuestionIds.json'),
            JSON.stringify(extendedQuestionIdsArray)
          );
        } catch (err) {
          console.log('Error getting all post Ids: ' + err);
        }
      },
    },
    {
      label: 'Step 3: Index Directory',
      click: async () => {
        let currentType;

        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone, progressDescription) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: progressDescription || ('% Completion indexing ' + currentType),
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
        const postIdsPath = path.join(files[0], 'PostIds.json');
        const hasPostIds = await fs.exists(postIdsPath);
        console.log('Found PostIds? ' + hasPostIds);

        if (hasPostIds) {
          // Limit indexing using the questions file. sepost must be first.
          const types = ['sepost', 'secomment', 'seuser', 'sepostlink'];
          const userIds = new Set();
          //const types = ['seuser'];
          for (const type of types) {
            currentType = type;
            console.log('indexing ' + type);
            await indexFromPostIds(postIdsPath, client, type, parameters.indexPrefix, onProgress, userIds);
          }
          await mainMsg.promiseRenderEvent('setbodytext', `Done indexing directory ${files[0]}`);
        } else {
          try {
            await readFiles(files ? files[0] : null, client, parameters.indexPrefix);
          } catch (err) {
            console.log('Error indexing files: ' + prettyFormat(err));
          }
        }
        console.log('Done reading files');
      },
    },
    {
      label: 'Step 4: Extends answers from ExtendedQuestionIds.json',
      click: async () => {
        // Update rendered display with progress information
        function onProgress(linesRead, totalHits, percentDone, progressDescription) {
          console.log(`Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
          mainMsg.promiseRenderEvent('progress', {
            description: progressDescription || '% Questions processed ',
            valuenow: String(percentDone),
            textresult: `Answers extended: ${totalHits}, Questions processed: ${linesRead}`,
          });
        }

        // Ask the user for ExtendedQuestionIds.json file to read
        const files = dialog.showOpenDialog({
          title: 'Get ExtendedQuestionIds.json file to process',
          properties: ['openFile']});

        await extendAnswersFromQuestions(files[0], client, parameters.indexPrefix, onProgress);
        await mainMsg.promiseRenderEvent('setbodytext', 'Done extending answers from questions');
      },
    },
  ],
};

module.exports = indexMenuTemplate;
