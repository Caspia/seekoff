/**
 * template for Elastic Menu definition
 * These function operate on ElasticSearch
 * @file
 */

const client = require('../modules/elasticClient.js');
const statusMsg = require('../modules/statusMsg');

const elasticMenuTemplate = {
  label: 'Elastic',
  submenu: [
    { label: 'Hello',
      click: function () {
        console.log('Hello, mainWindowId is ' + global.mainWindowId);
      }
    },
    { label: 'Ping',
      click: function () {
        // locate the status
        client.ping({
          requestTimeout: 5000
        })
          .then(r => {
            console.log('Ping successful');
            statusMsg.send('Ping Successful');
          })
          .catch(e => {
            console.log('elasticsearch down!');
            statusMsg.send('Ping Failed!');
          });
      }
    }
  ]
};

module.exports = elasticMenuTemplate;
