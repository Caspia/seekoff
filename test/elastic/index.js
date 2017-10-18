/**
 * Tests that read-in XML data is indexed properly into the elastic data store.
 */

const assert = require('chai').assert;
const path = require('path');
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const { readFiles } = require(path.join(libPath, 'elasticReader'));

const dataPath = path.join(__dirname, '..', 'data');

const TEST_HOST = 'localhost:9200';
const TEST_INDEX_PREFIX = 'testindex_';

// Expected response after indexing
const TEST_RESPONSES = {
  sepost: [
    {
      Id: '1',
      Title: 'What questions should be definitely off-topic?',
      Tags: ' discussion  scope  questions ',
    },
    {
      Id: '4',
      LastActivityDate: '2013-11-04T23:45:02.173',
    },
    {
      Id: '10',
      CommentCount: '5',
    },
  ],
  secomment: [
    {
      Id: '1',
      PostId: '2',
    },
    {
      Id: '5',
      Score: '0',
    },
    {
      Id: '81',
      Text: 'A searchable community driven database of ranked questions and answers.',
    },
  ],
  seuser: [
    {
      Id: '6',
      Reputation: '725',
    },
    {
      Id: '12',
      DisplayName: 'iKlsR',
    },
    {
      Id: '599',
      Location: 'Where the shadows lie',
    },
  ],
};

describe('indexing of xml files into elastic search', function () {
  let client;
  before(async function () {
    client = elasticClient.makeClient({host: TEST_HOST});
    for (const type in elasticClient.typeMappings) {
      // Delete test index if it exists
      try {
        await elasticClient.deleteIndex(client, TEST_INDEX_PREFIX + type);
      } catch (err) { }
      await elasticClient.createIndex(client, TEST_INDEX_PREFIX + type, type);
    }
  });

  after(async function () {
    for (const type in elasticClient.typeMappings) {
      await elasticClient.deleteIndex(client, TEST_INDEX_PREFIX + type);
    }
  });

  it('Indexes a directory containing stack overflow files', async function () {
    this.timeout(5000);
    await readFiles(dataPath, client, TEST_INDEX_PREFIX);
  });

  it('returns correct documents from index', async function () {
    for (const type in TEST_RESPONSES) {
      const ids = TEST_RESPONSES[type].map(item => item.Id);
      const response = await elasticClient.getDocuments(client, TEST_INDEX_PREFIX + type, type, ids);
      // console.log('Returned indices:\n' + prettyjson.render(response));
      TEST_RESPONSES[type].forEach((testResponse, i) => {
        for (const parm in testResponse) {
          // console.log('Checking type ' + type + ' value: ' + testResponse[parm]);
          assert.strictEqual(testResponse[parm], response.docs[i]._source[parm], 'post parameter as expected');
        }
      });
    }
  });

  it('returns documents from search', async function () {
    const res = await elasticClient.search(client, TEST_INDEX_PREFIX + 'sepost', 'compare OR better', {});
    // console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 3, 'Query returns proper number of hits');
    assert.equal(res.hits.hits[2]._source.Title, 'What questions should be definitely off-topic?', 'Expected post found');
  });
});
