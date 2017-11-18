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
const VOTETYPEID_UPMOD = '2';
const VOTETYPEID_DOWNMOD = '3';

/**
 * Given a set of postIds of relevant questions, index stackexchange
 * xml files into elasticsearch database. Posts.xml must be indexed first.
 * @param {string} questionsPath - Path to the Questions.json file.
 * @param {ElasticClient} client 
 * @param {ElasticType} type - of the documents to store
 * @param {string} indexPrefix - Prefix for elastic client index name 
 * @param {function.<totalLines, totalHits, percentDone>} progress callback
 */
async function indexFromQuestionIds(questionsPath, client, type, indexPrefix, onProgress) {
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
    secomment: async lineObject => elasticClient.multiNeeded.promiseNeeded(client, indexPrefix, 'sepost', lineObject.PostId),
    seuser: async lineObject => {
      if (Number(lineObject.Id) < 0) return false;
      return elasticClient.multiNeeded.promiseNeeded(client, indexPrefix, 'seuser', lineObject.Id);
    },
    sepostlink: async lineObject => {
      const [hasPostId, hasRelatedId] = await Promise.all([
        elasticClient.multiNeeded.promiseNeeded(client, indexPrefix, 'sepost', lineObject.PostId),
        elasticClient.multiNeeded.promiseNeeded(client, indexPrefix, 'sepost', lineObject.RelatedPostId),
      ]);
      return hasPostId || hasRelatedId;
    },
  };
  const shouldIndex = shouldIndexByType[type];
  let documentCount = 0;

  return readFile(
    filePath,
    async (lineObject) => {
      if (await shouldIndex(lineObject)) {
        documentCount++;
        return elasticClient.putDocument(client, indexPrefix + type, type, lineObject);
      }
    },
    (fileSize, bytesRead, linesRead) => {
      // Rewrite onProgress return from readFile with local onProgress call.
      if (onProgress) {
        onProgress(linesRead, documentCount, 100 * bytesRead / fileSize);
      }
    },
    // When the input file is closed, process any remaining requests
    () => {
      elasticClient.multiNeeded.flushRequests(client, indexPrefix, 'sepost')
        .catch((onrejected) => {
          console.log('Error flushing multiNeeded: ' + onrejected);
        });
    },
  );
}

/**
 * Given a set of postIds of relevant questions, index stackexchange
 * xml files into elasticsearch database. Posts.xml must be indexed first.
 * @param {string} questionsPath - Path to the Questions.json file.
 * @param {ElasticClient} client 
 * @param {ElasticType} type - of the documents to store
 * @param {string} indexPrefix - Prefix for elastic client index name 
 * @param {function.<totalLines, totalHits, percentDone>} progress callback
 */
async function indexFromPostIds(postIdsPath, client, type, indexPrefix, onProgress) {
  // Read PostIds.json to get post Ids
  const postIdsArray = JSON.parse(await fs.readFile(postIdsPath));
  const postIds = new Set(postIdsArray);

  // Delete existing index
  try {
    await elasticClient.deleteIndex(client, indexPrefix + type);
  } catch (err) { } // OK if index does not exist
  await elasticClient.createIndex(client, indexPrefix + type, type);

  // Index appropriate .xml in the same directory as PostIds.json
  if (!elasticClient.nameMappings[type]) throw new Error('Unsupported type: ' + type);
  const filePath = path.join(path.dirname(postIdsPath), elasticClient.nameMappings[type]);
  if (!(await fs.exists(filePath))) {
    throw new Error('file ' + elasticClient.nameMappings[type] + ' must exist in same directory as PostIds.json');
  }

  // Setup appropriate function to determine if a lineObject should be indexed.
  const shouldIndexByType = {
    sepost: async lineObject => postIds.has(Number(lineObject.Id)),
    secomment: async lineObject => postIds.has(Number(lineObject.PostId)),
    seuser: async lineObject => {
      if (Number(lineObject.Id) < 0) return false;
      return elasticClient.multiNeeded.promiseNeeded(client, indexPrefix, 'seuser', lineObject.Id);
    },
    sepostlink: async lineObject => postIds.has(Number(lineObject.PostId)) || postIds.has(Number(lineObject.RelatedPostId)),
  };
  const shouldIndex = shouldIndexByType[type];
  let documentCount = 0;

  await readFile(
    filePath,
    async (lineObject) => {
      if (await shouldIndex(lineObject)) {
        documentCount++;
        return elasticClient.putDocument(client, indexPrefix + type, type, lineObject);
      }
    },
    (fileSize, bytesRead, linesRead) => {
      // Rewrite onProgress return from readFile with local onProgress call.
      if (onProgress) {
        onProgress(linesRead, documentCount, 100 * bytesRead / fileSize);
      }
    },
    // When the input file is closed, process any remaining requests
    () => {
      elasticClient.multiNeeded.flushRequests(client, indexPrefix, type)
        .catch((onrejected) => {
          console.log('Error flushing multiNeeded: ' + onrejected);
        });
    },
  );
  return elasticClient.promiseRefreshIndex(client, indexPrefix + type);
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
        //console.log('ignoring failed indexing of row: ' + err.message);
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
 * Generate a PostIds.json file given the Questions.json file, that contains both questions
 * and answers to process, as well as related and linked posts.
 * 
 */
async function getAllPostIds(questionsPath, onProgress) {
  // Read Questions.json to get post Ids
  const postIdsArray = (JSON.parse(await fs.readFile(questionsPath))).postIds;
  const postIds = new Set(postIdsArray);

  // Read through the Posts.xml file, adding answers
  const postsPath = path.join(path.dirname(questionsPath), 'Posts.xml');
  const postLinksPath = path.join(path.dirname(questionsPath), 'PostLinks.xml');
  if (!(await fs.exists(postsPath))) {
    throw new Error('Posts.xml must exist in same directory as Questions.json: ' + postsPath);
  }
  if (!(await fs.exists(postLinksPath))) {
    throw new Error('PostLinks.xml must exist in same directory as Questions.json: ' + postLinksPath);
  }

  // Add related and linked posts
  let documentCount = 0;
  await readFile(
    postLinksPath,
    async (lineObject) => {
      if (postIds.has(Number(lineObject.PostId))) {
        documentCount++;
        postIds.add(Number(lineObject.RelatedPostId));
      }
      if (postIds.has(Number(lineObject.RelatedPostId))) {
        documentCount++;
        postIds.add(Number(lineObject.PostId));
      }
    },
    (fileSize, bytesRead, linesRead) => {
      // Rewrite onProgress return from readFile with local onProgress call.
      if (onProgress) {
        onProgress(linesRead, documentCount, 100 * bytesRead / fileSize);
      }
    },
    null,
  );

  // Add answers to questions
  documentCount = 0;
  await readFile(
    postsPath,
    async (lineObject) => {
      if (
        lineObject.PostTypeId == POSTTYPEID_ANSWER &&
        postIds.has(Number(lineObject.ParentId))
      ) {
        postIds.add(Number(lineObject.Id));
        documentCount++;
      }
    },
    (fileSize, bytesRead, linesRead) => {
      // Rewrite onProgress return from readFile with local onProgress call.
      if (onProgress) {
        onProgress(linesRead, documentCount, 100 * bytesRead / fileSize);
      }
    },
    null,
  );
  return [postIds, documentCount];
}

/**
 * @async
 * @param {string} filePath - path to the Posts XML file to process
 * @param {[string]} tags - include records with these tags, including title words
 * @param {function<totalLines, totalHits, percentDone>} progress callback
 * @return {number[]} - list of Post Ids of questions with these tags 
 */
async function getQuestionIdsByTags(filePath, tags, onProgress) {
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
    // Rewrite onProgress return from readFile with local onProgress call.
    if (onProgress) {
      onProgress(linesRead, postIds.length, 100 * bytesRead / fileSize);
    }
  });
  return postIds;
}

/**
 * Accumulate votes from Votes.xml
 */
async function totalVotes(filePath, postIds, onProgress) {
  // Read Votes.xml file, accumulating vote totals
  const voteTotals = new Map();
  let documentCount = 0;
  await readFile(
    filePath,
    async (lineObject) => {
      const postIdNum = Number(lineObject.PostId);
      if (postIds.has(postIdNum)) {
        let count = voteTotals.get(postIdNum);
        if (count === undefined) {
          count = 0;
          documentCount++;
        }
        if (lineObject.VoteTypeId == VOTETYPEID_UPMOD) {
          count++;
        } else if (lineObject.VoteTypeId == VOTETYPEID_DOWNMOD) {
          count--;
        }
        voteTotals.set(postIdNum, count);
      }
    },
    (fileSize, bytesRead, linesRead) => {
      // Rewrite onProgress return from readFile with local onProgress call.
      if (onProgress) {
        onProgress(linesRead, documentCount, 100 * bytesRead / fileSize);
      }
    },
  );
  return voteTotals;
}

module.exports = {
  getAllPostIds,
  getQuestionIdsByTags,
  indexFromPostIds,
  indexFromQuestionIds,
  readFiles,
  totalVotes,
};
