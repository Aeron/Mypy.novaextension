# Mypy Nova Extension

It’s a stand-alone [Nova](https://nova.app) extension to use
[Mypy](https://github.com/python/mypy), an optional static type checker for Python.

## Requirements

Before using the extension, it’s necessary to install Mypy itself if you don’t
have one already.

Mypy can be installed simply by running `pip install mypy`.

**Note**: The `--show-error-end` option only exists in version `0.981` or higher.
Remove it from the global extension configuration if using an earlier version. Yet
it’s better to use the latest `mypy` available.

## Configuration

The extension supports both global and workspace configurations.
A workspace configuration always overrides a global one.

### Options

There are three options available to configure: executable path, command arguments,
and check mode. By default, the executable path is `/usr/local/bin/mypy`, with
no additional arguments, and checking on changing.

You could alter the executable path if Mypy installed in a different place
or if `/usr/bin/env` usage is desirable.

In the case of `/usr/bin/env`, it becomes the executable path, and `mypy` becomes
the first argument.

Also, there is a _Python executable_ path available as a workspace-only option.
It’s just a handy alias for the `--python-executable` command argument.

### mypy.ini

The extension respects `pyproject.toml`, `mypy.ini`, and `.mypy.ini` in a project
directory as much as `mypy` command-line utility. So, there’s no need to specify the
`--config-file` argument explicitly.

## Caveats

### Read-Write Entitlement

It requires the `filesystem: read-write` entitlement because of the Mypy [inability
to read from `stdin`](https://github.com/python/mypy/issues/2119), so the extension
utilizes temporary shadow-files to solve it in case of check on change mode.

### Using mixed mode

In case you’re using the check on change/save mode, the command is still available
to use. So, if you try to use command after a check triggered by a related event, and
there are any errors, then discovered issues become duplicated in the Issues sidebar.

Yet, it’ll come to normal as soon as a related event triggers again.

Hopefully, I’ll find a way to fix it later.
