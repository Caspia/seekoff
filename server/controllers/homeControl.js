/**
 * Process requests from home page '/'
 */

exports.homeGet = function (req, res, next) {
  res.render('index', {title: 'Stack Caspia offline search'});
};

exports.homePost = function (req, res, next) {
  console.log('search_term: ' + req.body.search_term);
  req.checkBody('search_term', 'Search term must be specified.').notEmpty();
  req.sanitize('search_term').escape();
  req.sanitize('search_term').trim();

  const errors = req.validationErrors();

  if (errors) {
    console.log('controller error: ' + errors);
    res.render('index', { title: 'Stack Caspia offline search', errors });
  } else {
    res.render('searchresult', { title: 'Search Result', search_term: req.body.search_term });
  }
};
