/**
 * Reads stack overflow files from a directory and indexes into elastic search.
 */

const fs = require('fs-extra');
const path = require('path');
const elasticClient = require('./elasticClient');
const { readFile } = require('./dataSources');
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

// Definitions of integer field values from
// https://meta.stackexchange.com/questions/2677/database-schema-documentation-for-the-public-data-dump-and-sede
const POSTTYPEID_QUESTION = '1';
const POSTTYPEID_ANSWER = '2';

/**
 * Given a set of postIds of relevant questions, index stackexchange
 * xml files into elasticsearch database. Posts.xml must be indexed first.
 * @param {string} questionsPath - Path to the Questions.json file.
 * @param {ElasticClient} client 
 * @param {ElasticType} type - of the documents to store
 * @param {string} indexPrefix - Prefix for elastic client index name 
 */
async function indexFromPostIds(questionsPath, client, type, indexPrefix) {
  const postIndex = indexPrefix + 'sepost';
  // Read Questions.json to get post Ids
  const postIdsArray = (JSON.parse(await fs.readFile(questionsPath))).postIds;
  const postIds = new Set(postIdsArray);

  // Delete existing index
  try {
    await elasticClient.deleteIndex(client, indexPrefix + type);
  } catch (err) { } // OK if index does not exist
  await elasticClient.createIndex(client, indexPrefix + type, type);

  // Index appropriate .xml in the same directory as Questions.json
  if (!elasticClient.nameMappings[type]) throw new Error('Unsupported type: ' + type);
  const filePath = path.join(path.dirname(questionsPath), elasticClient.nameMappings[type]);
  if (!(await fs.exists(filePath))) {
    throw new Error('file ' + elasticClient.nameMappings[type] + ' must exist in same directory as Questions.json');
  }

  // Setup appropriate function to determine if a lineObject should be indexed.
  const shouldIndexByType = {
    sepost: async (lineObject) => {
      return (lineObject.PostTypeId == POSTTYPEID_QUESTION && postIds.has(Number(lineObject.Id))) ||
        (lineObject.PostTypeId == POSTTYPEID_ANSWER && postIds.has(Number(lineObject.ParentId)));
    },
    secomment: async lineObject => client.exists({index: postIndex, type: 'sepost', id: lineObject.PostId}),
    seuser: async lineObject => Number(lineObject.Id) >= 0,
    sepostlink: async lineObject => {
      const [hasPostId, hasRelatedId] = await Promise.all([
        client.exists({index: postIndex, type: 'sepost', id: lineObject.PostId}),
        client.exists({index: postIndex, type: 'sepost', id: lineObject.RelatedPostId}),
      ]);
      return hasPostId || hasRelatedId;
    },
  };
  const shouldIndex = shouldIndexByType[type];

  return readFile(filePath, async (lineObject) => {
    if (await shouldIndex(lineObject)) {
      return elasticClient.putDocument(client, indexPrefix + type, type, lineObject);
    }
  });
}

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
  for (const fileType in elasticClient.nameMappings) {
    const fileName = elasticClient.nameMappings[fileType];
    const filePath = path.join(directoryPath, fileName);
    // Make sure the file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      throw new Error('File ' + fileName + ' does not exist in directory ' + directoryPath);
    }

    await indexFile(filePath, fileType, client, indexPrefix);
  }
}

/**
 * @async
 * @param {string} filePath - path to the Posts XML file to process
 * @param {[string]} tags - include records with these tags, including title words
 * @param {function<totalLines, totalHits, percentDone>} progress callback
 * @return {number[]} - list of Post Ids of questions with these tags 
 */
async function getQuestionIdsByTags(filePath, tags, onprogress) {
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
    }
  }

  // Read through the whole file, determining matching Ids
  await readFile(filePath, processPost, (fileSize, bytesRead, linesRead) => {
    // Rewrite onprogress return from readFile with local onprogress call.
    if (onprogress) {
      onprogress(linesRead, postIds.length, 100 * bytesRead / fileSize);
    }
  });
  return postIds;
}

module.exports = {
  readFiles,
  getQuestionIdsByTags,
  indexFromPostIds,
};
