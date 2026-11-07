# @popsql/electron-google-oauth2
> Library that manages Google OAuth2 authentication for your [Electron](http://electron.atom.io) app.

## Install
```
// npm
$ npm install --save @popsql/electron-google-oauth2
// yarn
$ yarn add @popsql/electron-google-oauth2
```

### Requirements
Node.js 22 or later. In Electron, use a version that bundles Node.js 22 or later
(Electron 37 and later). The package ships CommonJS and works with `require`.

## Usage

### Access Token
```typescript
import ElectronGoogleOAuth2 from '@popsql/electron-google-oauth2';

app.on('ready', () => {
  const myApiOauth = new ElectronGoogleOAuth2(
    'CLIENT_ID',
    'CLIENT_SECRET',
    ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    { successRedirectURL: 'https://example.com/signed-in' },
  );

  myApiOauth.openAuthWindowAndGetTokens()
    .then(token => {
      // use your token.access_token
    });
});
```

### Refresh Token
```typescript
import ElectronGoogleOAuth2 from '@popsql/electron-google-oauth2';

app.on('ready', () => {
  const myApiOauth = new ElectronGoogleOAuth2(
    'CLIENT_ID',
    'CLIENT_SECRET',
    ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    { successRedirectURL: 'https://example.com/signed-in' },
  );

  const refreshToken = \\ Read the saved refresh token

  if(refreshToken) {
    myApiOauth.setTokens({ refresh_token: refreshToken });
  } else {
    myApiOauth.openAuthWindowAndGetTokens()
      .then(token => {
        // save the token.refresh_token secured to use it the next time the app loading
        // use your token.access_token
      });
  }
});
```

### Options
The fourth argument is an options object. `successRedirectURL` is required.

| Option | Default | Description |
| --- | --- | --- |
| `successRedirectURL` | (required) | The page that the browser shows after Google sends back the code. |
| `loopbackInterfaceRedirectionPort` | `42813` | The local port that gets the OAuth redirect. |
| `refocusAfterSuccess` | `true` | Show the visible app windows again after sign-in. |
| `prompt` | (none) | The Google [`prompt`](https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient) parameter. A space-delimited list of `none`, `consent` and `select_account`. Use `consent` to always get a refresh token. |

### Requires with plain JavaScript

```js
const ElectronGoogleOAuth2 = require('@popsql/electron-google-oauth2').default;
new ElectronGoogleOAuth2(CLIENT_ID, CLIENT_SECRET, SCOPES_LIST, { successRedirectURL: SUCCESS_URL });
```

## License
MIT
