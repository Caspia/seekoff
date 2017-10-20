/**
 * Route for root website /
 */

const router = require('express').Router();
const {homeGet} = require('../controllers/homeControl');

router.get('/', homeGet);

module.exports = router;
