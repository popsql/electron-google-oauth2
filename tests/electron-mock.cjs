// Replace the electron module for the test run.
// The tests load this file once through `node --require`, and then set the
// state fields to control the mock. The library under test gets the same
// module object, so it uses the mock, not the real electron package.
const Module = require('module');

const state = {
  // Every URL passed to shell.openExternal, in order.
  openedUrls: [],
  // Optional handler. It runs with the URL and can act as the browser.
  onOpenExternal: null,
  // Windows returned by electron.BrowserWindow.getAllWindows().
  windows: [],
  // Windows returned by @electron/remote BrowserWindow.getAllWindows().
  remoteWindows: [],
  // Count of BrowserWindow#show() calls, over all sources.
  shownWindows: 0,
  // Count of require('@electron/remote') calls.
  remoteLoads: 0,
};

function resetState() {
  state.openedUrls = [];
  state.onOpenExternal = null;
  state.windows = [];
  state.remoteWindows = [];
  state.shownWindows = 0;
  state.remoteLoads = 0;
}

class FakeBrowserWindow {
  constructor() {
    this.shownCount = 0;
  }

  isVisible() {
    return true;
  }

  show() {
    this.shownCount += 1;
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
    state.remoteLoads += 1;
    return require('./electron-remote-mock.cjs');
  }
  return originalLoad.call(this, request, parent, isMain);
};

module.exports = { electronMock, FakeBrowserWindow, resetState, state };
