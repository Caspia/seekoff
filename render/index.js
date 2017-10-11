/**
 * UI methods for the main window.
 * @file
 */

const mainMsg = require('./main/mainMsg');
const {ipcRenderer} = require('electron');
const pug = require('pug');

/**
 * Set text in the status area of UI
 * 
 * @param {String} msg The text to display. 
 */
function setStatusMsg (msg) {
  document.getElementById('statusfooter').innerText = msg;
}

window.onload = () => {
  const thefooter = document.getElementById('statusfooter');
  const thebody = document.getElementById('mainbody');
  mainMsg.onStatus(msg => {
    thefooter.innerText = msg;
    return null;
  });
  mainMsg.onBody(msg => {
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
function onMenuSelection () {
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
    }
  });

  ipcRenderer.on('renderview', (event, viewName, parms) => {
    console.log('renderview ' + viewName);
    const pugHtml = pug.renderFile(viewName, parms);
    console.log('pugResult: ' + pugHtml);
    document.getElementById('mainbody').innerHTML = pugHtml;
    //mainMsg.sendBody(pugHtml);

  });

}

function commandElasticPing () {
  ipcRenderer.send('elastic-request', 'ping');
}
