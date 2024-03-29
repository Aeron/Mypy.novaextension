# Change Log

These versions follow [Semantic Versioning 2.0](https://semver.org).

## 1.1.3 (2024-03-21)

This patch contains a fix for potential issues with user options deduplication,
uniformity, etc.

### Fixed

- Commands’ long and short user options handling

## 1.1.2 (2024-03-08)

It’s mainly refactoring and optimizations, except for a single issue fix.

### Fixed

- Issue duplication between the command and on-save checking.

## 1.1.1 (2023-05-29)

### Changed

- Extension main icon

### Added

- `mypy` version note in README

## 1.1.0 (2023-05-28)

This version mainly introduces support for `--show-error-end` and `--show-error-codes`
options—they become the default but not mandatory. The inverse options are supported as
well, so the extension stays backward-compatible.

### Changed

- Extension issue matcher pattern
- Global default command arguments

## 1.0.0 (2023-05-27)

### Changed

- Arguments handling with the shadow file option
- Safer promise behavior for expected errors
- Issues provider minor refactoring

## 0.1.3 (2022-10-31)

### Fixed

- Extension issue matcher pattern (by @samdoran and @guillaumealgis in #3)
- Temporary path handling (by @samdoran and @guillaumealgis in #4)

### Changed

- Executable path proper expansion (by @samdoran in #5)

### Added

- Error logging on invalid execution path (by @samdoran in #5)

## 0.1.0 (2020-10-08)

The initial public release.
