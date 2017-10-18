/**
 * Reads stack overflow files from a directory and indexes into elastic search.
 */

const fs = require('fs-extra');
const path = require('path');
const elasticClient = require('./elasticClient');
const { readFile } = require('./dataSources');
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

// Supported file names and types
const fileTypes = [
  ['Posts.xml', 'sepost'],
  ['Comments.xml', 'secomment'],
  ['Users.xml', 'seuser'],
];

async function indexFile(filePath, fileType, client, indexPrefix) {
  console.log('Deleting and recreating index: ' + indexPrefix + fileType);
  try {
    await elasticClient.deleteIndex(client, indexPrefix + fileType);
  } catch (err) { }
  await elasticClient.createIndex(client, indexPrefix + fileType, fileType);

  return readFile(filePath, async (lineObject) => {
    let result = null;
    try {
      result = await elasticClient.putDocument(client, indexPrefix + fileType, fileType, lineObject);
    } catch (err) {
      if (err.message.startsWith('Invalid Id')) {
        // We silently reject invalid ids like -1
        console.log('ignoring failed indexing of row: ' + err.message);
      } else {
        console.log('Failed to index row: ' + prettyjson.render(lineObject));
        console.log('Error: ' + err);
      }
    }
    return result;
  });
}

async function readFiles(directoryPath, client, indexPrefix) {
  // const indexPromises = [];
  for (const fileNameType of fileTypes) {
    const [ fileName, fileType ] = fileNameType;
    const filePath = path.join(directoryPath, fileName);
    // Make sure the file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      throw new Error('File ' + fileName + ' does not exist in directory ' + directoryPath);
    }

    // Create a promise to index the file.
    // indexPromises.push(indexFile(filePath, fileType, client, indexPrefix));
    await indexFile(filePath, fileType, client, indexPrefix);
  }
  // return Promise.all(indexPromises);
}

module.exports = {
  readFiles,
};
