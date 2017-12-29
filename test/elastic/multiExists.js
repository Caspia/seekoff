/**
 * Tests the multiNeeded call in client
 */
const assert = require('chai').assert;
const path = require('path');
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const { readFiles } = require(path.join(libPath, 'elasticReader'));
const {parameters} = require(path.join(libPath, 'parameters'));

const dataPath = path.join(__dirname, '..', 'data');
const TEST_HOST = 'localhost:9200';
const TEST_INDEX_PREFIX = 'testindex_';

describe(__filename, function () {
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
      for (const type in elasticClient.typeMappings) {
        await elasticClient.promiseRefreshIndex(client, TEST_INDEX_PREFIX + type);
      };
    });

    after(async function () {
      for (const type in elasticClient.typeMappings) {
        await elasticClient.deleteIndex(client, TEST_INDEX_PREFIX + type);
      }
    });

    it('correctly finds needed and missing user ids', async function () {
      // 21 is in both
      const u21 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, 'seuser', 21);
      // 1 is in neither
      const u1 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, 'seuser', 1);
      // 85 is in comments
      const u85 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, 'seuser', 85);
      // 10 is in posts
      const u10 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, 'seuser', 10);
      await elasticClient.multiNeeded.flushRequests(client, TEST_INDEX_PREFIX, 'seuser');
      assert(await u21, 'found user 21 in both');
      assert(!(await u1), 'did not find user 1');
      assert(await u85, 'found user 85 in comments');
      assert(await u10, 'found user 10 in posts');
    });

    it('correctly categorizes found and missing post ids', async function () {
      const type = 'sepost';
      const p1 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, type, 1);
      const p2 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, type, 2);
      const p3 = elasticClient.multiNeeded.promiseNeeded(client, TEST_INDEX_PREFIX, type, 123);
      await elasticClient.multiNeeded.flushRequests(client, TEST_INDEX_PREFIX, type);
      assert(await p1, 'Found id 1');
      assert(await p2, 'Found id 2');
      assert(!(await p3), 'Did not find id 123');
    });

    it('issues request at batch count via timeout', async function () {
      // override the default timeout to beat the mocha 10s limit
      parameters.indexTimeout = 2000;
      const BATCH_COUNT = 5;
      const type = 'sepost';
      const index = TEST_INDEX_PREFIX + type;
      const promises = [];
      for (let i = 0; i < BATCH_COUNT; i++) {
        promises.push(elasticClient.multiNeeded.promiseNeeded(client, index, type, String(i)));
      }
      const results = await Promise.all(promises);
      assert.equal(results.length, BATCH_COUNT, 'We get expected number of Promise results');
    });
  });
});
