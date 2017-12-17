#!/usr/bin/env node

/**
 * Application entry point for express search web server
 */

const app = require('../server/app');
const initapp = require('../server/initapp');

initapp(app);
