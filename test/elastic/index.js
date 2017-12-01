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
      Id: 1,
      Title: 'What questions should be definitely off-topic',
      Tags: ' discussion  scope  questions ',
    },
    {
      Id: 4,
      AcceptedAnswerId: 8,
    },
    {
      Id: 10,
      ParentId: 7,
    },
  ],
  secomment: [
    {
      Id: 1,
      PostId: 2,
    },
    {
      Id: 5,
      UserId: 6,
    },
    {
      Id: 81,
      Text: 'A searchable community driven database of ranked questions and answers.',
    },
  ],
  seuser: [
    {
      Id: 6,
      DisplayName: 'World Engineer',
    },
    {
      Id: 12,
      DisplayName: 'iKlsR',
    },
  ],
  sepostlink: [
    {
      Id: 41,
      RelatedPostId: 7,
    },
  ],
};

describe('indexing of xml files into elastic search', function () {
  let client;
  this.timeout(10000);
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

  //after(async function () {
  //  for (const type in elasticClient.typeMappings) {
  //    await elasticClient.deleteIndex(client, TEST_INDEX_PREFIX + type);
  //  }
  //});

  it('Indexes a directory containing stack overflow files', async function () {
    this.timeout(5000);
    await readFiles(dataPath, client, TEST_INDEX_PREFIX);
  });

  it('returns correct documents from index', async function () {
    for (const type in TEST_RESPONSES) {
      const ids = TEST_RESPONSES[type].map(item => item.Id);
      const response = await elasticClient.getDocuments(client, TEST_INDEX_PREFIX + type, type, ids);
      //console.log('Returned indices:\n' + prettyjson.render(response));
      TEST_RESPONSES[type].forEach((testResponse, i) => {
        for (const parm in testResponse) {
          // console.log('Checking type ' + type + ' value: ' + testResponse[parm]);
          assert.strictEqual(testResponse[parm], response.docs[i]._source[parm], 'post parameter as expected');
        }
      });
    }
  });

  it('returns documents from search', async function () {
    const res = await elasticClient.search(client, TEST_INDEX_PREFIX + 'sepost', 'questions', {});
    //console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 5, 'Query returns proper number of hits');
    assert.equal(res.hits.hits[0]._source.Title, 'What questions should be definitely off-topic', 'Expected post found');
  });

  it('returns answers for a post', async function () {
    const res = await elasticClient.answers(client, TEST_INDEX_PREFIX + 'sepost', '7', {});
    // console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 2, 'Answer query returns proper number of hits');
    assert(res.hits.hits.some(result => result._id == '9'), 'proper id of an answer found');
  });

  it('returns results for explain', async function () {
    const res = await elasticClient.explain(
      client,
      TEST_INDEX_PREFIX + 'sepost',
      'better',
      'sepost',
      1,
      {});
    assert(res.matched, 'Found search result in explain');
    assert(res.explanation.value < 1.0 && res.explanation.value > 0, 'explain value in range');
    //console.log('explain result is ' + prettyjson.render(res));
  });

  it('returns comments for a post', async function () {
    const res = await elasticClient.comments(client, TEST_INDEX_PREFIX + 'secomment', '6', {});
    // console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 8, 'Comment query returns proper number of hits');
    // assert(res.hits.hits.some(result => result._id == '9'), 'proper id of an answer found');
  });

  it('returns links for a post', async function () {
    const res = await elasticClient.links(client, TEST_INDEX_PREFIX + 'sepostlink', '4', {});
    // console.log(prettyjson.render(res));
    assert.equal(res.hits.total, 2, 'Limits query returns proper number of hits');
  });

  it('returns related for a post', async function () {
    const res = await elasticClient.related(client, TEST_INDEX_PREFIX + 'sepostlink', '1', {});
    assert.equal(res.hits.total, 2, 'Related query returns proper number of hits');
  });
});
