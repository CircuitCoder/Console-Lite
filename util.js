const os = require('os');

function supportsTitlebarStyle() {
  if(os.platform() !== 'darwin') return;
  const mainVer = parseInt(os.release().split('.')[0]);
  return Number.isInteger(mainVer) && mainVer >= 14; // 14 -> Yosemite
}

module.exports = {
  supportsTitlebarStyle,
};
