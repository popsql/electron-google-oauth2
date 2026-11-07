const assert = require('node:assert/strict');
const test = require('node:test');

const { electronMock, FakeBrowserWindow, resetState, state } = require('./electron-mock.cjs');
const ElectronGoogleOAuth2 = require('../lib/index.js').default;
const { getFreePort, requestCallback, stubTokenEndpoint } = require('./helpers.cjs');

// This file runs in its own process, so the module level BrowserWindow cache
// starts empty and the renderer branch runs here. Electron 13 and earlier
// expose the remote module as electron.remote.
test.beforeEach(() => {
  resetState();
});

test('the renderer path uses electron.remote when it exists', async () => {
  const port = await getFreePort();
  const client = new ElectronGoogleOAuth2('client-id', 'client-secret', ['scope-a'], {
    loopbackInterfaceRedirectionPort: port,
  });
  stubTokenEndpoint(client);
  const originalProcessType = process.type;
  const legacyWindow = new FakeBrowserWindow();
  const remoteWindow = new FakeBrowserWindow();
  process.type = 'renderer';
  electronMock.remote = {
    BrowserWindow: {
      getAllWindows() {
        return [legacyWindow];
      },
    },
  };

  try {
    state.windows = [];
    state.remoteWindows = [remoteWindow];
    let browserDone;
    state.onOpenExternal = () => {
      browserDone = requestCallback(port, '/callback?code=auth-code');
      return browserDone;
    };

    const tokens = await client.openAuthWindowAndGetTokens();
    await browserDone;

    assert.equal(tokens.access_token, 'access-token');
    assert.equal(legacyWindow.shownCount, 1);
    assert.equal(remoteWindow.shownCount, 0);
    assert.equal(state.remoteLoads, 0);
  } finally {
    delete electronMock.remote;
    process.type = originalProcessType;
  }
});
