# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-11-06
### Breaking changes
- Upgrade `google-auth-library` from 5 to 11. The tokens and the `Credentials` type
  come from the new version.
- Raise the Node.js requirement from 8 to 22. `google-auth-library` 11 and `gaxios` 8
  need Node.js 22 or later. In Electron, use a version that bundles Node.js 22 or
  later (Electron 37 and later).
- The package still ships CommonJS in `lib/`.
- `options.successRedirectURL` is now required. The old default pointed to
  `getstation.com`, which now redirects to an unrelated site. The constructor
  throws a `TypeError` if the option is missing or empty.
- `defaultElectronGoogleOAuth2Options` no longer has `successRedirectURL`.

### Changed
- Import `Credentials` from the root of `google-auth-library` instead of a deep path.
- TypeScript 6, `@types/node` 24 and Electron 45 for the build.

### Fixed
- Remove `gtoken`, `google-p12-pem` and `node-forge` 0.10, which had high advisories.
  `json-bigint` stays at 1.0.0 through `gcp-metadata` 9, which is not affected.

## [2.2.1] - 2023-04-27
### Fixed
- Remove `@electron/remote` as peerDependency as it's not required if using old version of `electron`

## [2.2.0] - 2023-04-27
### Added
- Fallback to using `@electron/remote` if `electron.remote` does not exist
- Add `dispose` method to ensure server object is closed

### Changed
- Dynamically import `BrowserWindow` if needed to avoid require usage

## [2.1.0] - 2020-02-04
### Changed
- Upgrade all dependencies

### Fixed
- Bundle TS helpers

## [1.0.0] - 2018-05-14
### Changed
- Typescript version
