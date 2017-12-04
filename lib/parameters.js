/**
 * Stores parameters in a file for reuse between sessions, and makes those parameters
 * available to other modules.
 */

const {app} = require('electron');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const path = require('path');
const fs = require('fs-extra');

const preferenceDefaults = {
  // host:port for elasticsearch server
  host: 'localhost:9200',
  // prefix of indexes to use in elasticsearch
  indexPrefix: 'javascript_',
  // list of tags (and title words) to include in index
  tagsToIndex: 'javascript node.js express passport mongoose html html5 bootstrap mocha electron pug jade',
  // list of tags (and title words) to exclude in index
  tagsToExclude: 'exploit sql-injection penetration-testing xss sniffing',
  // web port for search server
  defaultWebPort: 8080,
  // timeout in milliseconds to allow for an individual document index
  indexTimeout: 30000,
};

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
let parameters = Object.assign(defaultClone, parametersOld);

// Allow parameter overrides from environment
parameters.host = process.env.ELASTIC_HOST || parameters.host;
parameters.indexPrefix = process.env.ELASTIC_INDEX_PREFIX || parameters.indexPrefix;
parameters.tagsToIndex = process.env.ELASTIC_TAGS_TO_INDEX || parameters.tagsToIndex;
parameters.tagsToExclude = process.env.ELASTIC_TAGS_TO_EXCLUDE || parameters.tagsToExclude;
parameters.defaultWebPort = process.env.ELASTIC_DEFAULT_WEB_PORT || parameters.defaultWebPort;
parameters.indexTimeout = process.env.ELASTIC_INDEX_TIMEOUT || parameters.indexTimeout;

console.log('Using indexPrefix ' + parameters.indexPrefix);
module.exports = {parameters, preferenceDefaults};
