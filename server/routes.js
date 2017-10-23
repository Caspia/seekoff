/**
 * Linking routes to controllers
 */

const router = require('express').Router();
const {homeGet} = require('./controllers/homeControl');
const {searchGet} = require('./controllers/searchControl');

router.get('/', homeGet);
router.get('/search', searchGet);

module.exports = router;
