/**
 * Tests the multiExists call in client
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
    await readFiles(dataPath, client, TEST_INDEX_PREFIX);
  });

  after(async function () {
    for (const type in elasticClient.typeMappings) {
      await elasticClient.deleteIndex(client, TEST_INDEX_PREFIX + type);
    }
  });

  it('correctly categorizes found and missing ids', async function () {
    const type = 'sepost';
    const index = TEST_INDEX_PREFIX + type;
    const p1 = elasticClient.multiExists.promiseExists(client, index, type, '1');
    const p2 = elasticClient.multiExists.promiseExists(client, index, type, '2');
    const p3 = elasticClient.multiExists.promiseExists(client, index, type, '123');
    await elasticClient.multiExists.flushRequests(client, index, type);
    assert(await p1, 'Found id 1');
    assert(await p2, 'Found id 2');
    assert(!(await p3), 'Did not find id 123');
  });

  it('issues request at batch count via timeout', async function () {
    const BATCH_COUNT = 5;
    const type = 'sepost';
    const index = TEST_INDEX_PREFIX + type;
    const promises = [];
    for (let i = 0; i < BATCH_COUNT; i++) {
      promises.push(elasticClient.multiExists.promiseExists(client, index, type, String(i)));
    }
    const results = await Promise.all(promises);
    assert.equal(results.length, BATCH_COUNT, 'We get expected number of Promise results');
  });
});
