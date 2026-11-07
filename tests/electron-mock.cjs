// Replace the electron module for the test run.
// The tests load this file once through `node --require`, and then set the
// state fields to control the mock. The library under test gets the same
// module object, so it uses the mock, not the real electron package.
const Module = require('module');
const { pathToFileURL } = require('url');

// The library uses lazy `import()` calls in older builds. The hooks send those
// calls to the mocks. They also keep the @electron/remote mock faithful: its
// CommonJS shape has no ESM named exports.
const mockUrl = new URL('./electron-mock-esm.mjs', pathToFileURL(__filename));
const remoteMockUrl = new URL('./electron-remote-mock.cjs', pathToFileURL(__filename));

if (typeof Module.registerHooks === 'function') {
  Module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'electron') {
        return { shortCircuit: true, url: mockUrl.href };
      }
      if (specifier === '@electron/remote') {
        return { shortCircuit: true, url: remoteMockUrl.href };
      }
      return nextResolve(specifier, context);
    },
  });
} else {
  Module.register('./electron-mock-loader.mjs', pathToFileURL(__filename));
}

const state = {
  // Every URL passed to shell.openExternal, in order.
  openedUrls: [],
  // Optional handler. It runs with the URL and can act as the browser.
  onOpenExternal: null,
  // Windows returned by BrowserWindow.getAllWindows().
  windows: [],
  // Count of BrowserWindow#show() calls.
  shownWindows: 0,
};

function resetState() {
  state.openedUrls = [];
  state.onOpenExternal = null;
  state.windows = [];
  state.shownWindows = 0;
}

class FakeBrowserWindow {
  isVisible() {
    return true;
  }

  show() {
    state.shownWindows += 1;
  }
}

const shell = {
  openExternal(targetUrl) {
    state.openedUrls.push(targetUrl);
    if (state.onOpenExternal) {
      return Promise.resolve(state.onOpenExternal(targetUrl));
    }
    return Promise.resolve();
  },
};

const BrowserWindow = {
  getAllWindows() {
    return state.windows;
  },
};

const electronMock = { shell, BrowserWindow };

const originalLoad = Module._load;
Module._load = function loadWithElectronMock(request, parent, isMain) {
  if (request === 'electron') {
    return electronMock;
  }
  if (request === '@electron/remote') {
    return require('./electron-remote-mock.cjs');
  }
  return originalLoad.call(this, request, parent, isMain);
};

module.exports = { electronMock, FakeBrowserWindow, resetState, state };
