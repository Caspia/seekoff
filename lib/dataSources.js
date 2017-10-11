/**
 * methods to manage stack overflow data sources
 * @file
 */

const fs = require('fs-extra');
const readline = require('readline');
const xml2js = require('xml2js');
// const {putDocument} = require('../main/elasticRequest');

const parser = new xml2js.Parser({mergeAttrs: true, explicitArray: false});
const MAX_LINES = 100;

// We want to stream the result to reduce memory usage. We take advantage of the
// observation that stackoverflow data seems to send rows in single lines.
async function parseLine(line) {
  if (!line.startsWith('  <row')) {
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
            // console.log('parsed line is ' + JSON.stringify(result.row));
          }
          resolve(result.row);
        }
      });
    });
  }
}

/**
 * Read a Stack Exchange XML files, indexing rows
 * 
 * @param {String} filePath
 * @param {Function} action
 * @returns {Promise}
 */
function readFile(filePath, action) {
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
