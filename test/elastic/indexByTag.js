/**
 * Tests that read-in XML data is indexed properly by tags.
 */

const assert = require('chai').assert;
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars
const path = require('path');
const elasticClient = require('../../lib/elasticClient');

const {getQuestionIdsByTags, indexFromPostIds} = require('../../lib/elasticReader');

const postsPath = path.join(__dirname, '..', 'data', 'Posts.xml');
const questionsPath = path.join(__dirname, '..', 'data', 'Questions.json');
const TEST_HOST = 'localhost:9200';
const TEST_INDEX_PREFIX = 'testindex_';

describe('indexing of xml files works by tag', function () {
  this.timeout(10000);
  it('gets correct Ids by tag', async function () {
    const postIds = await getQuestionIdsByTags(postsPath, ['site-promotion']);
    //console.log('postIds is\n' + prettyjson.render(postIds));
    assert(postIds.length == 1, 'Found 1 match');
    assert(postIds[0] === 3, 'Matches Id 3');
  });

  it('finds a tag in a title only', async function () {
    const postIds = await getQuestionIdsByTags(postsPath, ['FAQ']);
    //console.log('postIds is\n' + prettyjson.render(postIds));
    assert(postIds.length == 1, 'Found 1 match');
    assert(postIds[0] === 2, 'Matches Id 2');
  });

  it('returns multiple Ids and also matches lower case', async function () {
    const postIds = await getQuestionIdsByTags(postsPath, ['site-promotion', 'faq']);
    //console.log('postIds is\n' + prettyjson.render(postIds));
    assert(postIds.length == 2, 'Found 2 match');
    assert(postIds.includes(3), 'Matches Id 3');
    assert(postIds.includes(2), 'Matches Id 2');
  });

  it('finds tags at end and beginning of title', async function () {
    const postIds = await getQuestionIdsByTags(postsPath, ['off-topic', 'the']);
    //console.log('postIds is\n' + prettyjson.render(postIds));
    assert(postIds.length == 3, 'Found 3 match');
    assert(postIds.includes(3), 'Matches Id 3');
    assert(postIds.includes(1), 'Matches Id 1');
    assert(postIds.includes(7), 'Matches Id 7');
  });

  it('indexes posts using Questions.json', async function () {
    const client = elasticClient.makeClient({host: TEST_HOST});
    for (const type in elasticClient.nameMappings) {
      await indexFromPostIds(questionsPath, client, type, TEST_INDEX_PREFIX);
    }

    // check Posts.xml
    await elasticClient.promiseRefreshIndex(client, TEST_INDEX_PREFIX + 'sepost');
    const posts = await elasticClient.getAllDocuments(client, TEST_INDEX_PREFIX + 'sepost');
    assert.equal(posts.hits.total, 5, 'Indexed correct number of posts');
    const indexedPosts = posts.hits.hits.map(hit => hit._id);
    const questionIds = ['1', '2', '4'];
    const answerIds = ['6', '8'];
    // Check using exists
    for (const id of questionIds) {
      assert(await client.exists({
        index: TEST_INDEX_PREFIX + 'sepost',
        type: 'sepost',
        id,
      }), 'questions exist using client.exists');
    }
    assert(questionIds.every(id => indexedPosts.includes(id)), 'All questions indexed');
    assert(answerIds.every(id => indexedPosts.includes(id)), 'All answers indexed');

    // check Comments.xml
    await elasticClient.promiseRefreshIndex(client, TEST_INDEX_PREFIX + 'secomment');
    const comments = await elasticClient.getAllDocuments(client, TEST_INDEX_PREFIX + 'secomment');
    const commentIds = [
      '1', '2', '3', '5', '27', '30', '32', '33', '34', '39', '40', '58', '60',
      '61', '63', '66', '78'];
    assert.equal(comments.hits.total, commentIds.length, 'Indexed correct number of comments');
    const indexedComments = comments.hits.hits.map(hit => hit._id);
    assert(commentIds.every(id => indexedComments.includes(id)), 'Indexed all expected comments');

    // check users
    await elasticClient.promiseRefreshIndex(client, TEST_INDEX_PREFIX + 'seuser');
    const users = await elasticClient.getAllDocuments(client, TEST_INDEX_PREFIX + 'seuser');
    assert.equal(6, users.hits.total, 'Found correct number of users');

    // check postlinks
    await elasticClient.promiseRefreshIndex(client, TEST_INDEX_PREFIX + 'sepostlink');
    const postlinks = await elasticClient.getAllDocuments(client, TEST_INDEX_PREFIX + 'sepostlink');
    const postlinkIds = ['1', '41', '82', '110'];
    const indexedPostlinks = postlinks.hits.hits.map(hit => hit._id);
    assert(postlinkIds.every(id => indexedPostlinks.includes(id)), 'Indexed all expected postlinks');
    assert.equal(postlinkIds.length, postlinks.hits.total, 'Found correct number of postlinks');
  });
});
