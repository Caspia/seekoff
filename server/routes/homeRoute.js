/**
 * Route for root website /
 */

const router = require('express').Router();
const {homeGet, homePost} = require('../controllers/homeControl');

router.get('/', homeGet);
router.post('/', homePost);

module.exports = router;
