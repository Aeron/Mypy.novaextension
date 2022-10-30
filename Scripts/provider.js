const categorySeverity = {  // TODO: move to Nova config maybe?
    "error": "Error",
    "note": "Info",
}

class IssuesProvider {
    constructor(config, issueCollection) {
        this.config = config;
        this.issueCollection = issueCollection;
    }

    async getProcess(filePath, tmpPath) {
        const executablePath = this.config.get("executablePath");
        const commandArguments = this.config.get("commandArguments");
        const pythonExecutablePath = this.config.get("pythonExecutablePath");
        let defaultOptions = [filePath];

        if (tmpPath) {
            defaultOptions.unshift("--shadow-file", "./" + filePath, tmpPath);
        }

        var options = [];

        if (commandArguments) {
            options = commandArguments
                .replaceAll("\n", " ")
                .split(" ")
                .map((option) => option.trim())
                .filter((option) => option !== " ");
        }

        if (pythonExecutablePath) {
            options = [...options, "--python-executable=" + pythonExecutablePath];
        }

        options = [...options, ...defaultOptions].filter((option) => option !== "");

        return new Process(
            executablePath,
            {
                args: Array.from(new Set(options)),
                stdio: ["ignore", "pipe", "pipe"],
                cwd: nova.workspace.path,  // NOTE: must be explicitly set
            }
        );
    }

    async provideIssues(editor) {
        this.issueCollection.clear();
        return await new Promise(resolve => this.check(editor, resolve));
    }

    async getTemporaryFilename(filePath) {
        var hash = 0;

        if (filePath.length > 0) {
            for (let char of filePath) {
                hash = ((hash << 5) - hash) + char.charCodeAt(0);
                hash = hash & hash;
            }
        }

        return hash + "." + Date.now() + ".tmp";
    }

    async check(editor, resolve) {
        if (editor.document.isEmpty) return;

        const textRange = new Range(0, editor.document.length);
        const content = editor.document.getTextInRange(textRange);
        const filePath = nova.workspace.relativizePath(editor.document.path);

        var tmpPath = null;

        if (this.config.get("checkMode") === "onChange") {
            const tmpFilename = await this.getTemporaryFilename(filePath);
            tmpPath = nova.extension.workspaceStoragePath + "/" + tmpFilename;
            const tmpFile = nova.fs.open(tmpPath, "w+t");

            tmpFile.write(content);
            tmpFile.close();
        }

        const parser = new IssueParser("mypy");

        const process = await this.getProcess(filePath, tmpPath);

        if (!process) return;

        process.onStdout((output) => parser.pushLine(output));
        process.onStderr((error) => console.error(error));
        process.onDidExit((status) => {
            console.info("Checking " + filePath);

            for (let issue of parser.issues) {
                let severity = categorySeverity[issue.code];

                if (severity) {
                    issue.severity = IssueSeverity[severity];
                }

                // NOTE: Nova version 1.2 and prior has a known bug
                if (nova.version[0] === 1 && nova.version[1] <= 2) {
                    issue.line += 1;
                    issue.column += 1;
                }
            }

            console.info("Found " + parser.issues.length + " issue(s)");

            if (tmpPath) {
                nova.fs.remove(tmpPath);
            }
            resolve(parser.issues);
            parser.clear();
        });

        console.info("Running " + process.command + " " + process.args.join(" "));

        process.start();
    }
}

module.exports = IssuesProvider;
