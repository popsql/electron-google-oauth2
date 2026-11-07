// Replace the electron module for the test run.
// The tests load this file once through `node --require`, and then set the
// state fields to control the mock. The library under test gets the same
// module object, so it uses the mock, not the real electron package.
const Module = require('module');
const { pathToFileURL } = require('url');

// The library uses `import('electron')` when it refocuses the windows.
// Loader hooks make that import get the mock too.
Module.register('./electron-mock-loader.mjs', pathToFileURL(__filename));

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
  return originalLoad.call(this, request, parent, isMain);
};

module.exports = { electronMock, FakeBrowserWindow, resetState, state };
