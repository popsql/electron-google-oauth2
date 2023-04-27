# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2023-04-27
# Added
- Fallback to using `@electron/remote` if `electron.remote` does not exist
- Add `dispose` method to ensure server object is closed

# Changed
- Dynamically import `BrowserWindow` if needed to avoid require usage

## [2.1.0] - 2020-02-04
### Changed
- Upgrade all dependencies

### Fixed
- Bundle TS helpers

## [1.0.0] - 2018-05-14
### Changed
- Typescript version
