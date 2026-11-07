const assert = require('node:assert/strict');
const test = require('node:test');
const { URL } = require('url');

const { FakeBrowserWindow, resetState, state } = require('./electron-mock.cjs');
const ElectronGoogleOAuth2 = require('../lib/index.js').default;
const {
  defaultElectronGoogleOAuth2Options,
} = require('../lib/index.js');
const {
  getFreePort,
  makeTokenResponse,
  parseTokenRequestBody,
  requestCallback,
  stubTokenEndpoint,
} = require('./helpers.cjs');

const CLIENT_ID = 'client-id';
const CLIENT_SECRET = 'client-secret';

function createClient(scopes = ['scope-a'], options = {}) {
  return new ElectronGoogleOAuth2(CLIENT_ID, CLIENT_SECRET, scopes, options);
}

function readAuthUrl(authUrl) {
  return new URL(authUrl);
}

test.beforeEach(() => {
  resetState();
});

test('constructor adds the profile and email scopes', () => {
  const client = createClient(['scope-a', 'profile']);

  assert.deepEqual(client.scopes, ['scope-a', 'profile', 'email']);
});

test('constructor merges the options with the defaults', () => {
  const defaults = createClient();
  assert.deepEqual(defaults.options, defaultElectronGoogleOAuth2Options);

  const client = createClient(['scope-a'], {
    loopbackInterfaceRedirectionPort: 43210,
    successRedirectURL: 'https://example.com/done',
  });
  assert.equal(client.options.loopbackInterfaceRedirectionPort, 43210);
  assert.equal(client.options.successRedirectURL, 'https://example.com/done');
  assert.equal(client.options.refocusAfterSuccess, true);
});

test('generateAuthUrl requests an offline code for the loopback redirect', () => {
  const client = createClient(['scope-a']);
  const authUrl = readAuthUrl(client.generateAuthUrl());

  assert.equal(authUrl.origin, 'https://accounts.google.com');
  assert.equal(authUrl.pathname, '/o/oauth2/v2/auth');
  assert.equal(authUrl.searchParams.get('access_type'), 'offline');
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(authUrl.searchParams.get('scope'), 'scope-a profile email');
  assert.equal(
    authUrl.searchParams.get('redirect_uri'),
    `http://127.0.0.1:${defaultElectronGoogleOAuth2Options.loopbackInterfaceRedirectionPort}/callback`,
  );
});

test('generateAuthUrl uses the configured loopback port', () => {
  const client = createClient(['scope-a'], { loopbackInterfaceRedirectionPort: 43211 });
  const authUrl = readAuthUrl(client.generateAuthUrl());

  assert.equal(authUrl.searchParams.get('redirect_uri'), 'http://127.0.0.1:43211/callback');
});

test('generateAuthUrl adds the AddSession flow when asked', () => {
  const client = createClient();
  const plainUrl = client.generateAuthUrl(false);
  const addSessionUrl = readAuthUrl(client.generateAuthUrl(true));

  assert.equal(addSessionUrl.origin, 'https://accounts.google.com');
  assert.equal(addSessionUrl.pathname, '/AddSession');
  assert.equal(addSessionUrl.searchParams.get('continue'), plainUrl);
});

test('setTokens stores the credentials on the underlying client', () => {
  const client = createClient();

  client.setTokens({ refresh_token: 'stored-refresh-token' });

  assert.equal(client.oauth2Client.credentials.refresh_token, 'stored-refresh-token');
});

test('openAuthWindowAndGetTokens exchanges the code and stores the tokens', async () => {
  const port = await getFreePort();
  const client = createClient(['scope-a'], { loopbackInterfaceRedirectionPort: port });
  const requests = stubTokenEndpoint(client);
  const forwardedTokens = [];
  client.on('tokens', (tokens) => forwardedTokens.push(tokens));
  let browserDone;
  let callbackResponse;
  state.onOpenExternal = () => {
    browserDone = requestCallback(port, '/callback?code=auth-code&state=state-value')
      .then((response) => {
        callbackResponse = response;
      });
    return browserDone;
  };

  const tokens = await client.openAuthWindowAndGetTokens();
  await browserDone;

  assert.equal(state.openedUrls.length, 1);
  assert.equal(readAuthUrl(state.openedUrls[0]).searchParams.get('access_type'), 'offline');
  assert.equal(callbackResponse.statusCode, 302);
  assert.equal(callbackResponse.headers.location, defaultElectronGoogleOAuth2Options.successRedirectURL);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.match(requests[0].url, /oauth2\.googleapis\.com\/token$/);
  const body = parseTokenRequestBody(requests[0]);
  assert.equal(body.get('code'), 'auth-code');
  assert.equal(body.get('client_id'), CLIENT_ID);
  assert.equal(body.get('client_secret'), CLIENT_SECRET);
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('redirect_uri'), `http://127.0.0.1:${port}/callback`);

  assert.equal(tokens.access_token, 'access-token');
  assert.equal(tokens.refresh_token, 'refresh-token');
  assert.equal(client.oauth2Client.credentials.access_token, 'access-token');
  assert.equal(client.oauth2Client.credentials.refresh_token, 'refresh-token');
  assert.equal(forwardedTokens.length, 1);
  assert.equal(forwardedTokens[0].access_token, 'access-token');
});

test('openAuthWindowAndGetTokens refocuses the visible windows', async () => {
  const port = await getFreePort();
  const client = createClient(['scope-a'], { loopbackInterfaceRedirectionPort: port });
  stubTokenEndpoint(client);
  state.windows = [new FakeBrowserWindow(), new FakeBrowserWindow()];
  state.onOpenExternal = async () => {
    await requestCallback(port, '/callback?code=auth-code');
  };

  await client.openAuthWindowAndGetTokens();

  assert.equal(state.shownWindows, 2);
});

test('openAuthWindowAndGetTokens does not touch the windows when refocus is off', async () => {
  const port = await getFreePort();
  const client = createClient(['scope-a'], {
    loopbackInterfaceRedirectionPort: port,
    refocusAfterSuccess: false,
  });
  stubTokenEndpoint(client);
  state.windows = [new FakeBrowserWindow()];
  state.onOpenExternal = async () => {
    await requestCallback(port, '/callback?code=auth-code');
  };

  await client.openAuthWindowAndGetTokens();

  assert.equal(state.shownWindows, 0);
});

test('the token endpoint response reaches the tokens event unchanged', async () => {
  const port = await getFreePort();
  const client = createClient(['scope-a'], { loopbackInterfaceRedirectionPort: port });
  stubTokenEndpoint(client, makeTokenResponse({ access_token: 'custom-token' }));
  const forwardedTokens = [];
  client.on('tokens', (tokens) => forwardedTokens.push(tokens));
  state.onOpenExternal = async () => {
    await requestCallback(port, '/callback?code=auth-code');
  };

  await client.openAuthWindowAndGetTokens();

  assert.equal(forwardedTokens.length, 1);
  assert.equal(forwardedTokens[0].access_token, 'custom-token');
  assert.equal(forwardedTokens[0].token_type, 'Bearer');
  assert.equal(typeof forwardedTokens[0].expiry_date, 'number');
});
