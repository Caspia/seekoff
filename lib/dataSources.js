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
const MAX_LINES = 100;

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
            //console.log('parsed line is\n' + prettyFormat(result.row));
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
 * @param {function<bytesTotal, bytesRead, linesRead>} onprogress - progress callback
 * @returns {Promise.<null>}
 */
function readFile(filePath, action, onprogress) {
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
      if (++linesRead % 1000 == 0 && onprogress) {
        onprogress(fileSize, fstream.bytesRead, linesRead);
      }
      //console.log('fstream.bytesRead is now ' + fstream.bytesRead);
      activeLines++;
      if (activeLines > MAX_LINES && !fstream.isPaused()) {
        fstream.pause();
      }
      try {
        const lineObject = await parseLine(input);
        if (lineObject) {
          // process the json
          await action(lineObject);
        }
      } catch (err) { reject(err); }
      activeLines--;
      if (activeLines <= MAX_LINES / 2 && fstream.isPaused()) {
        fstream.resume();
      }
      if (activeLines <= 0 && fileDone) {
        resolve();
      }
    });
    iface.on('close', () => {
      fileDone = true;
      if (activeLines <= 0) {
        resolve();
      }
    });
  });
}

module.exports = {
  readFile,
};
