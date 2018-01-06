/**
 * Main routine to startup search web server
 * Adapted from file www in express-web-tutorial
 * https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Tutorial_local_library_website
*/

const debug = require('debug')('seekoff:server');
const http = require('http');
const path = require('path');
const routes = require('./routes');
const express = require('express');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const {parameters} = require('../lib/parameters');

let gServer;
let gApp;

/**
 * Initializes express app for production environment (e.g. not testing)
 * @param {*} app
 */
function initapp(app) {
  process.on('SIGINT', () => {
    console.log('\nGracefully exiting');
    process.exit();
  });

  gApp = app;
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(expressValidator());

  // routing
  app.use('/', routes);

  const port = normalizePort(parameters.port);
  app.set('port', port);

  /**
   * Create HTTP server.
   */

  gServer = http.createServer(app);

  /**
   * Listen on provided port, on all network interfaces.
   */

  gServer.listen(port);
  gServer.on('error', onError);
  gServer.on('listening', onListening);
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const lport = parseInt(val, 10);

  if (isNaN(lport)) {
    // named pipe
    return val;
  }

  if (lport >= 0) {
    // port number
    return lport;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + gApp.get('port')
    : 'Port ' + gApp.get('port');

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = gServer.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

module.exports = initapp;
