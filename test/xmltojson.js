/**
 * Tests conversions of Stack Exchange xml files to json
 */

const assert = require('chai').assert;
const path = require('path');

const libPath = path.join(__dirname, '..', 'lib');
const { readFile } = require(path.join(libPath, 'dataSources'));

const dataPath = path.join(__dirname, 'data');

// Sampling of expected JSON results from Post.xml reading
const JSON_TESTS = [
  { index: 0,
    data: {
      Id: 1,
      ViewCount: 1791,
      Tags: ' discussion  scope  questions ',
    },
  },
  { index: 3,
    data: {
      Id: 4,
      PostTypeId: 1,
    },
  },
  { index: 7,
    data: {
      Id: 9,
      Body: '<p>I\'d encourage the use of either a blender prefix or a version prefix in order to make it clear what it is that number refers to. It might be obvious to many but the clarity would be improved even if it\'s less DRY.</p>\u000A',
    },
  },
  { index: 8,
    data: {
      Id: 10,
      CommentCount: 5,
    },
  },
];

describe('Stack Exchange xml to json functionality', function () {
  const parsedObjects = [];

  it('reads posts into json', async function () {
    const postsPath = path.join(dataPath, 'Posts.xml');
    await readFile(postsPath, 'sepost', (lineObject) => {
      assert(lineObject, 'returned something into readFile action');
      parsedObjects.push(lineObject);
    });
  });

  it('correctly matches sample values', function () {
    for (const test of JSON_TESTS) {
      for (const parm in test.data) {
        assert.strictEqual(test.data[parm], parsedObjects[test.index][parm],
          'parsed object value matches expectation');
      }
    }
  });
});
