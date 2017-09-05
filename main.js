/**
 * UI methods for the main window.
 * @file
 */

const {remote} = require('electron');
const statusMsg = require('./lib/modules/statusMsg');

window.onload = () => {
  const thefooter = document.getElementById('statusfooter');
  const thebutton = document.getElementById('thebutton');
  thefooter.innerText = 'Yes sirree!';
  thebutton.addEventListener('click', element => {
    thefooter.innerText = 'Clicked! mainWindowId is ' + remote.getGlobal('mainWindowId');
  });
  statusMsg.onStatus(msg => {
    thefooter.innerText = msg;
    return null;
  });
};
