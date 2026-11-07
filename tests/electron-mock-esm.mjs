// ESM view of the CJS electron mock. It shares the same state object.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { electronMock } = require('./electron-mock.cjs');

export const shell = electronMock.shell;
export const BrowserWindow = electronMock.BrowserWindow;
export default electronMock;
