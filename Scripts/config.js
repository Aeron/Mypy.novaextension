function get_config_value(key) {
    const _key = `${nova.extension.identifier}.${key}`;
    const global = nova.config.get(_key);
    let workspace = nova.workspace.config.get(_key);

    if (typeof global === "boolean" && typeof workspace == "number") {
        if (workspace === -1) workspace = null
        else workspace = Boolean(workspace)
    }

    if (workspace !== null && global !== workspace) return workspace;
    return global;
}

// NOTE: we do not really need a class here
const Config = {
    executablePath: () => get_config_value("executablePath"),
    commandArguments: () => get_config_value("commandArguments"),
    checkMode: () => get_config_value("checkMode"),
    pythonExecutablePath: () => get_config_value("pythonExecutablePath"),
}

module.exports = Config;
