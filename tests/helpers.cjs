const http = require('http');
const net = require('net');

// Time to wait for the loopback server to accept a connection.
const CONNECT_RETRY_DELAY_MS = 20;
const CONNECT_RETRY_LIMIT = 100;

/**
 * Reserve a free port on the loopback interface.
 * The server is closed before the port is returned.
 */
async function getFreePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

function requestOnce(port, pathAndQuery) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port, path: pathAndQuery, method: 'GET' },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve({
          body: Buffer.concat(chunks).toString('utf8'),
          headers: response.headers,
          statusCode: response.statusCode,
        }));
      },
    );
    request.on('error', reject);
    request.end();
  });
}

/**
 * Do a GET request on the loopback server.
 * Retry while the server is not listening yet.
 */
async function requestCallback(port, pathAndQuery) {
  for (let attempt = 0; attempt < CONNECT_RETRY_LIMIT; attempt += 1) {
    try {
      return await requestOnce(port, pathAndQuery);
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
    }
  }
  throw new Error(`The loopback server on port ${port} did not start.`);
}

/**
 * Get the default token response of the Google token endpoint.
 */
function makeTokenResponse(overrides = {}) {
  return {
    access_token: 'access-token',
    expires_in: 3600,
    refresh_token: 'refresh-token',
    scope: 'scope-a profile email',
    token_type: 'Bearer',
    ...overrides,
  };
}

/**
 * Replace the transporter of the client with a stub.
 * The stub records each request and returns a token response.
 */
function stubTokenEndpoint(client, responseBody = makeTokenResponse()) {
  const requests = [];
  client.oauth2Client.transporter.request = async (options) => {
    requests.push(options);
    return {
      config: options,
      data: { ...responseBody },
      headers: {},
      request: {},
      status: 200,
      statusText: 'OK',
    };
  };
  return requests;
}

/**
 * Parse the body of a token request. The body is form data in all versions
 * of google-auth-library that we support.
 */
function parseTokenRequestBody(options) {
  return new URLSearchParams(options.data);
}

module.exports = {
  getFreePort,
  makeTokenResponse,
  parseTokenRequestBody,
  requestCallback,
  stubTokenEndpoint,
};
