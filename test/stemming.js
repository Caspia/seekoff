/**
 * Tests that our stemming and search remove appropriate terms
 */

const assert = require('chai').assert;
const {makeDoesMatch} = require('../lib/elasticReader');

// tests are lines of  [tagsToExclude, lineObject, result]
const tests = [
  ['exploits', {Title: 'There are many exploits here.'}, true],
  ['sql-injection', {Id: '1', Title: 'Does this sql-injection work?'}, true],
  ['python attack', {Id: '2', Title: 'Does javascript support this attack?'}, true],
  ['python attack', {Id: '3', Title: 'These are not the droids you are looking for'}, false],
  ['python attack', {Id: '4', Title: 'These are not the droids you are looking for', Tags: 'javascript attack'}, true],
  ['python attack', {Id: '5', Title: 'This so-called "attack" will never work'}, true],
  ['xss exploit', {Id: '6', Title: 'Someone might <strong>exploit</strong> this!'}, true],
  [undefined, {Id: '7', Title: 'These are not the droids you are looking for'}, false],
];

describe(__filename, function () {
  describe('Exclude terms with stemming', function () {
    it('correctly excludes', function () {
      tests.forEach(test => {
        const [exclude, term, result] = test;
        const shouldReject = makeDoesMatch(exclude, false);
        //console.log('Testing ' + JSON.stringify(test));
        result ? assert.isTrue(shouldReject(term)) : assert.isFalse(shouldReject(term));
      });
    });
  });
});
