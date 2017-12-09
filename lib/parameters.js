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
  elasticHost: 'localhost:9200',
  // prefix of indexes to use in elasticsearch
  indexPrefix: 'javascript_',
  // list of tags (and title words) to include in index
  tagsToInclude:
   'javascript node.js express passport mongoose html html5' +
   'bootstrap mocha electron pug jade reactjs react-jsx react-router redux' +
   'git eslint',
  // list of tags (and title words) to exclude in index
  tagsToExclude: 'exploit sql-injection penetration-testing xss sniff attack',
  // web port for search server
  port: 8080,
  // timeout in milliseconds to allow for an individual document index
  indexTimeout: 30000,
  // directory containing .xml files to index (no default)
  xmlFilePath: '',
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
parameters.elasticHost = process.env.STACKOFF_ELASTIC_HOST || parameters.elasticHost;
parameters.indexPrefix = process.env.STACKOFF_INDEX_PREFIX || parameters.indexPrefix;
parameters.tagsToInclude = process.env.STACKOFF_TAGS_TO_INCLUDE || parameters.tagsToInclude;
parameters.tagsToExclude = process.env.STACKOFF_TAGS_TO_EXCLUDE || parameters.tagsToExclude;
parameters.defaultWebPort = process.env.STACKOFF_PORT || parameters.port;
parameters.indexTimeout = process.env.STACKOFF_INDEX_TIMEOUT || parameters.indexTimeout;
parameters.xmlFilePath = process.env.STACKOFF_XML_FILE_PATH || parameters.xmlFilePath;

console.log('Using indexPrefix ' + parameters.indexPrefix);
console.log('Using xmlFilePath ' + parameters.xmlFilePath);
module.exports = {parameters, preferenceDefaults};
