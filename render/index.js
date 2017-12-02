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
    thebody.innerHTML = pug.renderFile('views/progress.pug', {
      description: '% complete',
      valuenow: '40',
      textresult: 'I am result',
      progresswidth: 'width:40%',
    });
    return 'I am doit results';
  });

  handleEvent('progress', async (data) => {
    thebody.innerHTML = pug.renderFile(
      'views/progress.pug', {
        description: data.description,
        valuenow: data.valuenow,
        textresult: data.textresult,
        progresswidth: `width:${data.valuenow}%`,
      });
  });

  handleEvent('setbodytext', async function (text) {
    thebody.innerHTML = text;
  });

  handleEvent('setparameters', async function (parameters) {
    const DOMMutation = promiseDOMMutation();
    thebody.innerHTML = pug.renderFile('views/parameters.pug', {parameters});
    await DOMMutation;

    const submitElement = document.getElementById('promptbutton');
    const cancelElement = document.getElementById('cancelbutton');

    // wait for form result, returning parameters
    return new Promise((resolve, reject) => {
      function onClick(event) {
        event.preventDefault();
        submitElement.removeEventListener('click', onClick);
        cancelElement.removeEventListener('click', onCancel);
        for (const key in parameters) {
          parameters[key] = document.getElementById(key).value;
        }
        thebody.innerHTML = 'Parameters saved';
        resolve(parameters);
      }
      function onCancel(event) {
        event.preventDefault();
        submitElement.removeEventListener('click', onClick);
        cancelElement.removeEventListener('click', onCancel);
        thebody.innerHTML = 'Parameters not saved';
        resolve(parameters);
      }
      submitElement.addEventListener('click', onClick);
      cancelElement.addEventListener('click', onCancel);
    });
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
