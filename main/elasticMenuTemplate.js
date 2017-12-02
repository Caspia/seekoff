/**
 * template for Elastic Menu definition
 * These function operate on ElasticSearch
 * @file
 */

const {client, createIndex, deleteIndex} = require('../lib/elasticClient.js');
const {doPing, getIndices} = require('./elasticRequest');
const mainMsg = require('../main/mainMsg');
const pug = require('pug');

const elasticMenuTemplate = {
  label: 'Elastic',
  submenu: [
    { label: 'Test',
      click: () => mainMsg.fireMenuSelection('elastic-test'),
    },
    { label: 'Ping',
      click: () => doPing(),
    },
    { label: 'Get Indices',
      click: function () {
        getIndices();
        /* */
        client.indices.get({index: '*'})
          .then(result => {
            let indicies = [];
            for (const prop in result) {
              indicies.push(prop);
              //console.log('prop: (' + typeof prop + ') ' + prop);
            }
            const pugHtml = pug.renderFile('views/indicies.pug', {indicies});
            //console.log('pugResult: ' + pugHtml);
            mainMsg.sendBody(pugHtml);
          })
          .catch(err => {
            console.log('Error: ' + err);
          });
        /* */
      },
    },
    {
      label: 'Create Index',
      click: function () {
        createIndex()
          .then(() => {
            console.log('Index created');
            mainMsg.sendStatus('Index created');
          })
          .catch(err => {
            console.log('Error creating index: ' + err);
            mainMsg.sendStatus(err.message || err);
          });
      },
    },
    {
      label: 'Delete index ...',
      click: function () {
        deleteIndex('posts')
          .then(() => {
            mainMsg.sendStatus('Index deleted');
          })
          .catch((err) => {
            mainMsg.sendStatus(err.message || err);
          });
      },
    },
  ],
};

module.exports = elasticMenuTemplate;
