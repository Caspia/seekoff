/**
 * methods to read stack overflow XML data sources
 * @module dataSources
 */

const fs = require('fs-extra');
const readline = require('readline');
const xml2js = require('xml2js');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const typeMappings = require('./typeMappings');

/**
 * Callback used to track file read progress
 * @typedef {function} ProgressCallback
 * @global
 * @callback
 * @param {number} bytesTotal - Number of bytes total needed to read
 * @param {number} bytesRead - Number of bytes read
 * @param {number} linesRead - Number of lines read
 */

/**
 * Action to perform on a single stack exchange record,
 * as a per-line callback operating on a JS object.
 * @typedef {function} LineAction
 * @global
 * @async
 * @callback
 * @param {Object} lineObject - XML stack exchange record reinterpreted as JS object 
 */

const parser = new xml2js.Parser({mergeAttrs: true, explicitArray: false});
const MAX_READ_LINES = 128;

/**
 * Given an object parsed from XML, clean up the object by converting strings
 * to numbers where appropriate, and deleting unused fields.
 * @param {Object} lineObject - js representation of XML row, to be cleaned in place.
 * @param {ElasticType} type - elasticsearch type 
 */
function cleanLine(lineObject, type) {
  const typeMap = typeMappings[type];
  for (const attribute in lineObject) {
    try {
      const attributeProperties = typeMap.properties[attribute];
      if (!attributeProperties) {
        delete lineObject[attribute];
      } else if (attributeProperties.type === 'integer') {
        lineObject[attribute] = Number(lineObject[attribute]);
      }
    } catch (err) {} // This is an optimization than can be skipped if issues.
  }
}

// We want to stream the result to reduce memory usage. We take advantage of the
// observation that stackoverflow data seems to send rows in single lines.
// Example line:
//   <row Id="1" CreationDate="2013-05-22T22:22:44.293" PostId="4" RelatedPostId="7" LinkTypeId="1" />

/**
 * Given a string that contains XML, return a JS
 * Object that has the XML fields for the 'row' XML element.
 *
 *
 * @async
 * @param {string} line
 * @returns {Object} 
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

module.exports = {
  /**
   * Read a Stack Exchange XML file, processing rows with a callback. This method limits
   * lines in process to prevent excessive memory usage.
   *
   * @param {string} filePath - Full path to file to process
   * @param {ElasticType} type - type for use in cleanup, null to skip cleanup
   * @param {LineAction} action - the action to perform on each record
   * @param {ProgressCallback} onProgress - (bytesTotal, bytesRead, linesRead) progress callback
   * @param {function} onDataDone - () called when data flow is stopped to hint at need
   *                                  to flush downstream batching
   * @returns {Promise.<null>}
   */
  readFile: function readFile(filePath, type, action, onProgress, onDataDone) {
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
            if (type) cleanLine(lineObject, type);
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
  },
};
