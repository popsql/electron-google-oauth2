// The real @electron/remote re-exports its bindings with a loop over computed
// property names. Node's ESM interop cannot see those names, so a native
// import of that package exposes only its default export. This mock keeps the
// same shape, to catch a build that uses a native import.
const { state } = require('./electron-mock.cjs');

const remoteBindings = {
  BrowserWindow: {
    getAllWindows() {
      return state.windows;
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
