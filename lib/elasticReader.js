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
  ['PostLinks.xml', 'sepostlink'],
];

async function indexFile(filePath, fileType, client, indexPrefix) {
  // console.log('Deleting and recreating index: ' + indexPrefix + fileType);
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

// Definitions of integer field values from
// https://meta.stackexchange.com/questions/2677/database-schema-documentation-for-the-public-data-dump-and-sede
const POSTTYPEID_QUESTION = '1';
const POSTTYPEID_ANSWER = '2';

/**
 * @async
 * @param {string} filePath - path to the Posts XML file to process
 * @param {[string]} tags - include records with these tags, including title words
 * @return {number[]} - list of Post Ids of questions with these tags 
 */
async function getQuestionIdsByTags(filePath, tags) {
  const postIds = [];

  // Pre-calculate regular expressions to detect each tag.
  const tagsRE = tags.reduce((result, tag) => {
    result[tag] = new RegExp('(?:\\s|^)' + tag + '(?:\\s|$)', 'i');
    return result;
  }, {});

  // return true if this post is a question and contains the tag
  async function processPost(lineObject) {
    // Only process Questions
    if (!lineObject ||
        !lineObject.PostTypeId ||
        (lineObject.PostTypeId != POSTTYPEID_QUESTION)) {
      return false;
    }

    // check the tag. We'll assume that a word occurring in the title is
    // equivalent to a tag.
    if (tags.some((tag) => {
      const matchesTag =
        (lineObject.Title && tagsRE[tag].test(lineObject.Title)) ||
        (lineObject.Tags && tagsRE[tag].test(lineObject.Tags));
      return matchesTag;
    })) {
      // Tag matches for this question, include
      postIds.push(parseInt(lineObject.Id, 10));
      //console.log('Found matching post with Title: ' + lineObject.Title +
      //  ' tags: ' + lineObject.Tags);
    }
  }

  // Read through the whole file, determining matching Ids
  await readFile(filePath, processPost);
  return postIds;
}

module.exports = {
  readFiles,
  getQuestionIdsByTags,
};
