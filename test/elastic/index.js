/**
 * Tests that read-in XML data is indexed properly into the elastic data store.
 */

const assert = require('chai').assert;
const path = require('path');
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const { readFile } = require(path.join(libPath, 'dataSources'));

const dataPath = path.join(__dirname, '..', 'data');

const TEST_HOST = 'localhost:9200';
const TEST_INDEX = 'testindex';

// Expected response after indexing
const TEST_RESPONSES = [
  {
    index: 0,
    data: {
      Id: '1',
      Title: 'What questions should be definitely off-topic?',
      Tags: ' discussion  scope  questions ',
    },
  },
  {
    index: 1,
    data: {
      Id: '4',
      LastActivityDate: '2013-11-04T23:45:02.173',
    },
  },
  {
    index: 2,
    data: {
      Id: '10',
      CommentCount: '5',
    },
  },
];

describe('indexing of xml file into elastic search', function () {
  let client;
  before(async function () {
    client = elasticClient.makeClient({host: TEST_HOST});
    // Delete test index if it exists
    try {
      await elasticClient.deleteIndex(client, TEST_INDEX);
    } catch (err) { }
    await elasticClient.createIndex(client, TEST_INDEX, 'sePath');
  });

  after(async function () {
    await elasticClient.deleteIndex(client, TEST_INDEX);
  });

  it('indexes Posts.xml file', async function () {
    const postsPath = path.join(dataPath, 'Posts.xml');
    await readFile(postsPath, async (lineObject) => {
      let response = await elasticClient.putDocument(client, TEST_INDEX, 'sePost', lineObject);
      assert.equal(response.result, 'created', 'returned something from readFile action');
      return response;
    });
  });

  it('returns from index the just-indexed Posts', async function () {
    const response = await elasticClient.getDocuments(client, TEST_INDEX, 'sePost', [1, 4, 10]);
    // console.log('Returned indices:\n' + prettyjson.render(response));
    for (const testResponse of TEST_RESPONSES) {
      for (const parm in testResponse.data) {
        assert.strictEqual(testResponse.data[parm], response.docs[testResponse.index]._source[parm], 'post parameter as expected');
      }
    }
  });

  it('returns documents from search', async function () {
    const res = await elasticClient.search(client, TEST_INDEX, 'compare OR better', {});
    // console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 3, 'Query returns proper number of hits');
    assert.equal(res.hits.hits[2]._source.Title, 'What questions should be definitely off-topic?', 'Expected post found');
  });
});
