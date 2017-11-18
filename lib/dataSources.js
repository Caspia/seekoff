/**
 * methods to manage stack overflow data sources
 * @file
 */

const fs = require('fs-extra');
const readline = require('readline');
const xml2js = require('xml2js');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
// const {putDocument} = require('../main/elasticRequest');

const parser = new xml2js.Parser({mergeAttrs: true, explicitArray: false});
const {MAX_READ_LINES} = require('./constants.js');

// We want to stream the result to reduce memory usage. We take advantage of the
// observation that stackoverflow data seems to send rows in single lines.
/**
 * Given a string that contains XML, return a promise that resolves to a JS
 * Object that has the XML fields for the 'row' XML element.
 * Example line:
 * '  <row Id="1" CreationDate="2013-05-22T22:22:44.293" PostId="4" RelatedPostId="7" LinkTypeId="1" />'
 *
 * @param {string} line
 * @returns {Promise.<Object>}
 */
async function parseLine(line) {
  if (line.indexOf('<row ') == -1) {
    return null;
  } else {
    return new Promise((resolve, reject) => {
      parser.parseString(line, (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (result.row) {
            // Replace <> tag separators with spaces
            if (result.row.Tags) {
              result.row.Tags = result.row.Tags.replace(/[<>]/g, ' ');
            }
          }
          resolve(result.row);
        }
      });
    });
  }
}

/**
 * Action to perform on a single stack exchange record,
 * as a per-line callback operating on a JS object.
 * @typedef {async function(object) : undefined} LineAction
 */

/**
 * Read a Stack Exchange XML files, indexing rows
 *
 * @param {string} filePath - Full path to file to process
 * @param {LineAction} action - the action to perform on each record
 * @param {function<bytesTotal, bytesRead, linesRead>} onProgress - progress callback
 * @param {function<>} onDataDone - called when data flow is stopped to hint at need
 *                                  to flush downstream batching
 * @returns {Promise.<null>}
 */
function readFile(filePath, action, onProgress, onDataDone) {
  let linesRead = 0;
  const fileSize = fs.statSync(filePath).size;

  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('no path specified'));
    }

    const fstream = fs.createReadStream(filePath);
    let fileDone = false;
    const iface = readline.createInterface({ input: fstream });
    let activeLines = 0;

    // limit index for test
    iface.on('line', async (input) => {
      if (++linesRead % 1000 == 0 && onProgress) {
        onProgress(fileSize, fstream.bytesRead, linesRead);
      }
      activeLines++;
      if (activeLines > MAX_READ_LINES && !fstream.isPaused()) {
        fstream.pause();
      }
      try {
        const lineObject = await parseLine(input);
        if (lineObject) {
          // process the json
          await action(lineObject);
        }
      } catch (err) { console.log('Error processing file line: ' + err); }
      activeLines--;
      if (activeLines <= MAX_READ_LINES / 2 && fstream.isPaused() && !fileDone) {
        fstream.resume();
      }
      if (activeLines <= 0 && fileDone) {
        resolve();
      }
    });
    iface.on('close', () => {
      fileDone = true;

      // multiNeeded batches requests, and needs this to flush.
      if (onDataDone) {
        onDataDone();
      }

      if (activeLines <= 0) {
        resolve();
      }
    });
  });
}

module.exports = {
  readFile,
};
