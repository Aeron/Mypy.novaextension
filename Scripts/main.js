const Config = require("./config");
const IssuesProvider = require("./provider");

exports.activate = function() {
    const config = new Config();
    const issueCollection = new IssueCollection("mypy");
    const issuesProvider = new IssuesProvider(config, issueCollection);

    console.info("Executable path: " + config.get("executablePath"));
    console.info("Command arguments: " + config.get("commandArguments"));
    console.info("Check mode: " + config.get("checkMode"));

    nova.fs.mkdir(nova.extension.workspaceStoragePath);

    var assistant = null;

    for (c of [nova.config, nova.workspace.config]) {
        c.observe("cc.aeron.nova-mypy.checkMode", () => {
            if (assistant) {
                assistant.dispose();
                assistant = null;
            }

            const checkMode = config.get("checkMode");

            if (checkMode !== "-") {
                assistant = nova.assistants.registerIssueAssistant(
                    "python", issuesProvider, {"event": checkMode}
                );
            }
        });
    }

    nova.commands.register("checkWithMypy", (editor) => {
        issuesProvider.check(editor, (issues) => {
            issueCollection.set(editor.document.uri, issues);
        });
    });
}

exports.deactivate = function() {
    nova.fs.rmdir(nova.extension.workspaceStoragePath);
}
