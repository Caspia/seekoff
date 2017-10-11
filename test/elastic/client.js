/**
 * Tests of Elastic Search connectivity
 */
const assert = require('chai').assert;
const path = require('path');

const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

const DEFAULT_HOST = 'localhost:9200';
const TEST_INDEX = 'testindex';

describe('elasticClient functionality', function () {
  let client;
  before(async function () {
    client = elasticClient.client;
    // Delete test index if it exists
    try {
      await elasticClient.deleteIndex(client, TEST_INDEX);
    } catch (err) { }
  });

  after(async function () {
    await elasticClient.deleteIndex(client, TEST_INDEX);
  });

  it('makeClient works in default configuration', function () {
    const testClient = elasticClient.makeClient({});
    assert(testClient.transport._config.host == DEFAULT_HOST, 'created client has default host');
  });

  it('createIndex works', async function () {
    await elasticClient.createIndex(client, TEST_INDEX, 'sePath');
    const indicies = await elasticClient.getIndicies(client);
    assert(indicies.includes(TEST_INDEX), 'the created test index should be in the list of indicies');
  });

});
