/**
 * Process requests from home page '/'
 */

exports.homeGet = function (req, res, next) {
  res.render('index', {title: 'Seekoff offline search'});
};
