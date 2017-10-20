/**
 * Route for /search
 */

const router = require('express').Router();
const {searchGet} = require('../controllers/searchControl');

router.get('/', searchGet);

module.exports = router;
