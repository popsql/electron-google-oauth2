const assert = require('node:assert/strict');
const net = require('net');
const test = require('node:test');

const { resetState, state } = require('./electron-mock.cjs');
const ElectronGoogleOAuth2 = require('../lib/index.js').default;
const { getFreePort, requestCallback } = require('./helpers.cjs');

function createClient(port, options = {}) {
  return new ElectronGoogleOAuth2('client-id', 'client-secret', ['scope-a'], {
    loopbackInterfaceRedirectionPort: port,
    ...options,
  });
}

async function canListenOn(port) {
  const probe = net.createServer();
  try {
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', resolve);
    });
    return true;
  } catch (error) {
    return false;
  } finally {
    await new Promise((resolve) => probe.close(resolve));
  }
}

test.beforeEach(() => {
  resetState();
});

test('the loopback server answers other paths with 404', async () => {
  const port = await getFreePort();
  const client = createClient(port);
  let otherResponse;
  state.onOpenExternal = async () => {
    otherResponse = await requestCallback(port, '/not-the-callback');
    await requestCallback(port, '/callback?code=auth-code');
  };

  const code = await client.getAuthorizationCode();

  assert.equal(otherResponse.statusCode, 404);
  assert.equal(code, 'auth-code');
});

test('the loopback server redirects to the success URL', async () => {
  const port = await getFreePort();
  const client = createClient(port, { successRedirectURL: 'https://example.com/done' });
  let browserDone;
  let callbackResponse;
  state.onOpenExternal = () => {
    browserDone = requestCallback(port, '/callback?code=auth-code&state=value')
      .then((response) => {
        callbackResponse = response;
      });
    return browserDone;
  };

  await client.getAuthorizationCode();
  await browserDone;

  assert.equal(callbackResponse.statusCode, 302);
  assert.equal(callbackResponse.headers.location, 'https://example.com/done');
});

test('an error from Google is reported as an exception', async () => {
  const port = await getFreePort();
  const client = createClient(port);
  state.onOpenExternal = async () => {
    await requestCallback(port, '/callback?error=access_denied&error_description=User%20denied');
  };

  await assert.rejects(client.getAuthorizationCode(), {
    message: 'User denied',
  });
});

test('a callback without a code is reported as an unknown error', async () => {
  const port = await getFreePort();
  const client = createClient(port);
  state.onOpenExternal = async () => {
    await requestCallback(port, '/callback?state=value');
  };

  await assert.rejects(client.getAuthorizationCode(), {
    message: 'Unknown',
  });
});

test('dispose closes the loopback server', async () => {
  const port = await getFreePort();
  const client = createClient(port);
  let browserDone;
  state.onOpenExternal = () => {
    browserDone = requestCallback(port, '/waiting-for-browser');
    return browserDone;
  };

  const codePromise = client.getAuthorizationCode();
  codePromise.catch(() => {});
  await browserDone;
  await client.dispose();

  assert.equal(await canListenOn(port), true);
});

test('dispose is safe without a running server', async () => {
  const client = createClient(await getFreePort());

  await client.dispose();
  await client.dispose();
});
