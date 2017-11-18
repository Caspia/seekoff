/**
 * Test the summing of votes using totalVotes
 */

const assert = require('chai').assert;
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const elasticReader = require('../../lib/elasticReader');
const fs = require('fs-extra');

const postIdsPath = path.join(__dirname, '..', 'data', 'PostIds.json');
const votesPath = path.join(__dirname, '..', 'data', 'Votes.xml');

describe(path.basename(__filename), function () {
  describe('Summing of votes from Votes.xml', function () {
    it('correctly gives values for ids', async function () {
      // Read PostIds.json to get post Ids
      const postIdsArray = JSON.parse(await fs.readFile(postIdsPath));
      const postIds = new Set(postIdsArray);

      const voteTotals = await elasticReader.totalVotes(votesPath, postIds);
      assert.equal(voteTotals.get(1), 4, 'id 1 has 4 votes');
      assert.equal(voteTotals.get(10), 2, 'id 10 with downvotes has 2 votes');
    });
  });
});
