/**
 * Process requests from searchs page '/search'
 */

const path = require('path');
const html2plaintext = require('html2plaintext');
const sanitizeHtml = require('sanitize-html');

const libPath = path.join(__dirname, '..', '..', 'lib');
const elasticClient = require(path.join(libPath, 'elasticClient'));
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

const client = elasticClient.client;

exports.searchGet = async function (req, res, next) {
  try {
    console.log('search term is ' + req.query.search_term);
    if (req.query.search_term) {
      console.log('trying elastic search');
      const searchResults = await elasticClient.search(
        client,
        'stackexchange_' + 'sepost',
        req.query.search_term,
        {},
      );
      // console.log('search result: ' + prettyjson.render(searchResults));

      let renderResults = [{title: 'No results'}]; // what we will pass to template
      // Get or fake titles
      let hitResults;
      try { hitResults = searchResults.hits.hits; } catch (err) {}
      if (hitResults && hitResults.length) {
        renderResults = hitResults.map((hitResult) => {
          const renderResult = {};
          // console.log('hitResult: ' + prettyjson.render(hitResult));
          if (hitResult._source) {
            // Get a title, using Body if Title missing
            if (hitResult._source.Title) {
              renderResult.title = hitResult._source.Title;
            } else if (hitResult._source.Body) {
              const textBody = html2plaintext(hitResult._source.Body);
              renderResult.title =
                textBody.length > 60
                  ? textBody.substr(0, 60) + '...'
                  : textBody;
            }

            // Get highlight
            if (hitResult.highlight) {
              renderResult.highlight = '';
              for (const field in hitResult.highlight) {
                console.log('dirty highlight for ' + field + ' is !!!!!\n' + hitResult.highlight[field] + '\n!!!!!');
                console.log('clean highlight for ' + field + ' is !!!!!\n' + sanitizeHtml(hitResult.highlight[field]) + '\n!!!!!');
                renderResult.highlight += sanitizeHtml(hitResult.highlight[field]);
              }
            } else {
              console.log('no highlightfound');
            }
          } else {
            renderResult.title = 'Unparsable result';
          }
          return renderResult;
        });
      }
      res.render('search', {title: 'Stack Caspia offline search', renderResults});
    }
  } catch (err) {
    console.log('Error in searchControl get: ' + err);
    res.render('search', {errors: [err]});
  }
};
