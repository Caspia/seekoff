/**
 * Make full index from command line without Electron app
 */

const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const elasticClient = require('./lib/elasticClient');
const {parameters} = require('./lib/parameters');
const fs = require('fs-extra');

const {
  getQuestionIdsByTags,
  indexFromPostIds,
  getAllPostIds,
  extendAnswersFromQuestions} = require('./lib/elasticReader');

async function doAllSteps() {
  // Step #1: Select questions to index by tag, creating Questions.json
  const questionsPath = path.join(parameters.xmlFilePath, 'Questions.json');
  {
    const onProgress = (linesRead, totalHits, percentDone, progressDescription) => {
      console.log(`select questions: Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
    };

    console.log('Step 1 of 4: Selecting questions based on tags');
    if (!parameters.xmlFilePath) {
      throw new Error('xmlFilePath not defined in parameters');
    }
    const postsPath = path.join(parameters.xmlFilePath, 'Posts.xml');

    if (!(await fs.exists(postsPath))) {
      throw new Error('Posts.xml not found at ' + parameters.xmlFilePath);
    }
    const postIds = await getQuestionIdsByTags(postsPath, null, onProgress);

    // Write the results to a file in the same directory
    await fs.writeFile(questionsPath, JSON.stringify({
      tagsToInclude: parameters.tagsToInclude,
      tagsToExclude: parameters.tagsToExclude,
      postIds,
    }));
  }

  // Step #2: Extend posts to process using links and answers,
  //   creating PostIds.json and ExtendedQuestionsIds.json
  const allPostIdsPath = path.join(parameters.xmlFilePath, 'PostIds.json');
  const extendedQuestionIdsPath = path.join(parameters.xmlFilePath, 'ExtendedQuestionIds.json');
  console.log('Step 2 of 4: Adding links and answers to get allPostIds');
  {
    const onProgress = (linesRead, totalHits, percentDone, progressDescription) => {
      console.log(`make allPostIds: Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
    };

    const [allPostIds, documentCount, questionIds] = await getAllPostIds(questionsPath, onProgress);
    console.log('Selected document count: ' + documentCount);
    // Write the results to a file in the same directory
    {
      const allPostIdsArray = Array.from(allPostIds);
      await fs.writeFile(allPostIdsPath, JSON.stringify(allPostIdsArray));
    }
    {
      const extendedQuestionIdsArray = Array.from(questionIds);
      await fs.writeFile(extendedQuestionIdsPath, JSON.stringify(extendedQuestionIdsArray));
    }
  }

  // Step #3: Index items from allPostIds to elastic search database
  const client = elasticClient.client;
  {
    console.log('Step 3 of 4: indexing into ElasticSearch');
    const onProgress = (linesRead, totalHits, percentDone, progressDescription) => {
      console.log(`${progressDescription}: Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
    };

    const types = ['sepost', 'secomment', 'seuser', 'sepostlink'];
    //const types = ['seuser'];
    for (const type of types) {
      console.log('indexing ' + type);
      await indexFromPostIds(allPostIdsPath, client, type, parameters.indexPrefix, onProgress);
    }
  }

  // step #4: extend answers from posts
  console.log('Step 4 of 4: Extending answers for questions in ExtendedQuestionIds.json');
  {
    const onProgress = (linesRead, totalHits, percentDone, progressDescription) => {
      console.log(`extending answers: Read:${linesRead} Hits:${totalHits} completed: ${percentDone.toFixed(2)}%`);
    };
    await extendAnswersFromQuestions(extendedQuestionIdsPath, client, parameters.indexPrefix, onProgress);
  }
}

doAllSteps()
  .catch(err => console.log(err))
  .then(result => console.log('All Done!'));
