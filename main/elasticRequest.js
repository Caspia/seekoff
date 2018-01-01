/**
 * Elastic Search connector
 * (Main Process)
 */

const elasticsearch = require('elasticsearch');
const {ipcMain} = require('electron');
const mainMsg = require('./mainMsg');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error',
});

function doPing() {
  console.log('ping request');
  client.ping({
    requestTimeout: 5000,
  })
    .then(r => {
      mainMsg.promiseRenderEvent('setbodytext', '<h3>Ping Successful</h3>');
    })
    .catch(e => {
      mainMsg.promiseRenderEvent('setbodytext', '<h3>Ping Failed!</h3>');
    });
}

function getIndices() {
  console.log('elasticRequest getIndices');
  client.indices.get({index: '*'})
    .then(result => {
      let indicies = [];
      for (const prop in result) {
        indicies.push(prop);
        console.log('prop: (' + typeof prop + ') ' + prop);
      }
      mainMsg.renderView('views/indicies.pug', {indicies});
      /*
      const pugHtml = pug.renderFile('views/indicies.pug', {indicies});
      console.log('pugResult: ' + pugHtml);
      mainMsg.sendBody(pugHtml);
      */
    })
    .catch(err => {
      console.log('Error: ' + err);
    });
}

async function putDocument(index, type, body) {
  return new Promise((resolve, reject) => {
    client.index({index: index, type: type, id: body.Id, body: body}, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

/**
 * Handle requests for specific elastic search operations from renderer.
 */
ipcMain.on('elastic-request', (event, type, parms) => {
  console.log('elastic-search request type ' + type);
  switch (type) {
    case 'ping': {
      doPing();
      break;
    }
    default: {
      console.log('Unknown elastic-search request type ' + type);
    }
  }
});

module.exports = {client, doPing, getIndices, putDocument};
