/**
 * Stores parameters in a file for reuse between sessions, and makes those parameters
 * available to other modules.
 * @module parameters
 */

const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const fs = require('fs-extra');

/**
 * Default values of parameters.
 * @property (...) - property names are identical to parameter properties
 */
module.exports.preferenceDefaults = {
  elasticHost: 'localhost:9200',
  indexPrefix: 'javascript_',
  tagsToInclude:
  'javascript node.js express passport mongoose html html5' +
  'bootstrap mocha electron pug jade reactjs jsx react-router redux' +
  'git eslint jasmine',
  tagsToExclude: 'exploit sql-injection penetration-testing xss sniff attack crack',
  port: 8080,
  indexTimeout: 30000,
  xmlFilePath: '',
};

const preferenceDefaults = module.exports.preferenceDefaults;

// read in the configuration file
let parametersOld = {};
try {
  const prefsPath = path.join(require('os').homedir(), '.stackoff', 'prefs.json');
  console.log('Loading parameters from ' + prefsPath);
  parametersOld = JSON.parse(fs.readFileSync(prefsPath));
} catch (err) {
  console.log('Failed to find parameters file, using defaults');
} // Just use defaults on error (which occurs during mocha for example)

// Assign over defaults so that new defaults are picked up
const defaultClone = JSON.parse(JSON.stringify(preferenceDefaults));
let parms = Object.assign(defaultClone, parametersOld);

// Allow parameter overrides from environment
parms.elasticHost = process.env.STACKOFF_ELASTIC_HOST || parms.elasticHost;
parms.indexPrefix = process.env.STACKOFF_INDEX_PREFIX || parms.indexPrefix;
parms.tagsToInclude = process.env.STACKOFF_TAGS_TO_INCLUDE || parms.tagsToInclude;
parms.tagsToExclude = process.env.STACKOFF_TAGS_TO_EXCLUDE || parms.tagsToExclude;
parms.port = process.env.STACKOFF_PORT || parms.port;
parms.indexTimeout = process.env.STACKOFF_INDEX_TIMEOUT || parms.indexTimeout;
parms.xmlFilePath = process.env.STACKOFF_XML_FILE_PATH || parms.xmlFilePath;

console.log('Using indexPrefix ' + parms.indexPrefix);
console.log('Using xmlFilePath ' + parms.xmlFilePath);

/**
 * Parameters used to manage the indexing and display
 * @property {string} elasticHost - host:port for elasticsearch server
 * @property {string} indexPrefix - prefix of indexes to use in elasticsearch
 * @property {string} tagsToInclude - list of tags (and title words) to include in the index, space separated.
 * @property {string} tagsToExclude - list of tags (and title words) to exclude in the index, space separated.
 * @property {number} port  - tcp port for the web server
 * @property {number} indexTimeout - timeout in milliseconds for an individual document to index
 * @property {string} xmlFilePath - path to the xml files to be processed wen creating the indices
 */
module.exports.parameters = parms;
