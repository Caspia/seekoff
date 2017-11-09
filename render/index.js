/**
 * UI methods for the main window in the rendered HTML.
 * @file
 */

const mainMsg = require('./main/mainMsg');
const {ipcRenderer, ipcMain} = require('electron');
const pug = require('pug');
const prettyFormat = require('pretty-format'); // eslint-disable-line no-unused-vars
const prettyjson = require('prettyjson'); // eslint-disable-line no-unused-vars

/**
 * Set text in the status area of UI
 * 
 * @param {String} msg The text to display. 
 */
function setStatusMsg(msg) {
  document.getElementById('statusfooter').innerText = msg;
}

window.onload = () => {
  const thebody = document.getElementById('mainbody');

  // Setup event listeners with actions

  handleEvent('doit', async (data) => {
    console.log('event doit received data is\n' + prettyFormat(data));
    return 'I am doit results';
  });

  handleEvent('getTags', async () => {
    // render the tags form
    const DOMMutation = promiseDOMMutation();
    thebody.innerHTML = pug.renderFile('views/prompt.pug', {label: 'Enter space separated list of tags'});
    await DOMMutation;
    const buttonElement = document.getElementById('promptbutton');

    // wait for form result
    return new Promise((resolve, reject) => {
      function onClick(event) {
        event.preventDefault();
        const inputElement = document.getElementById('name');
        console.log('input element value is ' + inputElement.value);
        buttonElement.removeEventListener('click', onClick);
        resolve(inputElement.value.split(' '));
      }
      buttonElement.addEventListener('click', onClick);
    });
  });

  handleEvent('setbodytext', async function (text) {
    thebody.innerHTML = text;
  });

  ipcRenderer.on('status', (event, msg) => {
    document.getElementById('statusfooter').innerText = msg;
  });

  // setup listener to render the body
  onBody(msg => {
    thebody.innerHTML = msg;
    return null;
  });

  // Setup listener to process main menu selections
  onMenuSelection();

  document.querySelector('#pingbutton')
    .addEventListener('click', (event) => {
      console.log('onclick pingbutton');
      ipcRenderer.send('elastic-request', 'ping');
    });
};

/**
 * Process a menu selection from main process
 */
function onMenuSelection() {
  ipcRenderer.on('menuselect', (event, menuEvent) => {
    console.log('Menu selected: ' + menuEvent);
    switch (menuEvent) {
      case 'elastic-test': {
        setStatusMsg('Menu select elastic-test');
        break;
      }
      case 'elastic-ping': {
        commandElasticPing();
        break;
      }
      case 'count-tags': {
        console.log('I am count-tags');
      }
    }
  });

  ipcRenderer.on('renderview', (event, viewName, parms) => {
    console.log('renderview ' + viewName);
    const pugHtml = pug.renderFile(viewName, parms);
    console.log('pugResult: ' + pugHtml);
    document.getElementById('mainbody').innerHTML = pugHtml;
    // mainMsg.sendBody(pugHtml);
  });
}

function commandElasticPing() {
  ipcRenderer.send('elastic-request', 'ping');
}

/**
 * Set response to a status message
 * (use in Renderer process)
 * @param {Function(String)} f function to process body
 */
function onBody(f) {
  ipcRenderer.on('body', (event, html, onReady) => {
    f(html);
    if (onReady) {
      onReady();
    }
  });
}

/**
 * @typedef EventObject
 * @see "Event object" in https://electron.atom.io/docs/api/ipc-main/
 */
/**
 * Setup listener for Main process events and handle
 * @param {string} eventName - Name of the event 
 * @param {function<EventObject, data>} f - Function to handle the "data" sent by the main process,
 *                                          returns opaque object to send to main process
 */
function handleEvent(eventName, f) {
  ipcRenderer.on(eventName, async (event, data) => {
    let result;
    let error;
    try {
      result = await f(data);
    } catch (err) {
      error = err;
    }
    event.sender.send(eventName + '-response', result, error);
  });
}

/**
 * returns a Promise that resolves when a DOM mutation completes.
 */
function promiseDOMMutation() {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver((mutations) => {
      observer.disconnect();
      resolve();
    });
    const thebody = document.getElementById('mainbody');
    observer.observe(
      thebody,
      { attributes: true, childList: true, characterData: true, subtree: true });
  });
}
