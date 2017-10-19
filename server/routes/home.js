/**
 * Route for root website /
 */

const router = require('express').Router();

router.get('/', (req, res, next) => {
  res.render('index', {title: 'Stack Caspia offline search'});
});

module.exports = router;
