// The real @electron/remote re-exports its bindings with a loop over computed
// property names. This mock keeps the same shape. It also returns its own
// window list, so a test can tell which module supplied BrowserWindow.
const { state } = require('./electron-mock.cjs');

const remoteBindings = {
  BrowserWindow: {
    getAllWindows() {
      return state.remoteWindows;
    },
  },
};

const exportedRemote = {};

Object.defineProperty(exportedRemote, '__esModule', { value: true });
for (const name of Object.keys(remoteBindings)) {
  Object.defineProperty(exportedRemote, name, {
    configurable: true,
    enumerable: true,
    get: () => remoteBindings[name],
  });
}

module.exports = exportedRemote;
