const assert = require('node:assert/strict');
const test = require('node:test');

const { FakeBrowserWindow, resetState, state } = require('./electron-mock.cjs');
const ElectronGoogleOAuth2 = require('../lib/index.js').default;
const { getFreePort, requestCallback, stubTokenEndpoint } = require('./helpers.cjs');

// This file runs in its own process, so the module level BrowserWindow cache
// starts empty and the renderer branch runs here. The other test files leave
// `process.type` unset, which selects the main process branch.
test.beforeEach(() => {
  resetState();
});

test('the renderer path takes BrowserWindow from the CommonJS remote module', async () => {
  const port = await getFreePort();
  const client = new ElectronGoogleOAuth2('client-id', 'client-secret', ['scope-a'], {
    loopbackInterfaceRedirectionPort: port,
  });
  stubTokenEndpoint(client);
  const originalProcessType = process.type;
  process.type = 'renderer';

  try {
    state.windows = [new FakeBrowserWindow()];
    let browserDone;
    state.onOpenExternal = () => {
      browserDone = requestCallback(port, '/callback?code=auth-code');
      return browserDone;
    };

    const tokens = await client.openAuthWindowAndGetTokens();
    await browserDone;

    assert.equal(tokens.access_token, 'access-token');
    assert.equal(state.shownWindows, 1);
  } finally {
    process.type = originalProcessType;
  }
});
