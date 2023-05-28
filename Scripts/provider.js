class IssuesProvider {
    constructor(config, issueCollection) {
        this.config = config;
        this.issueCollection = issueCollection;
    }

    async getProcess(filePath, tmpPath) {
        const executablePath = nova.path.expanduser(this.config.get("executablePath"));
        const commandArguments = this.config.get("commandArguments");
        const pythonExecutablePath = this.config.get("pythonExecutablePath");
        const defaultOptions = (tmpPath) ? ["--shadow-file", filePath, tmpPath] : [];

        if (!nova.fs.stat(executablePath)) {
            console.error(`Executable ${executablePath} does not exist`);
            return;
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
                args: [...Array.from(new Set(options)), filePath],
                stdio: ["ignore", "pipe", "pipe"],
                cwd: nova.workspace.path,  // NOTE: must be explicitly set
            }
        );
    }

    async provideIssues(editor) {
        this.issueCollection.clear();
        return new Promise((resolve, reject) => this.check(editor, resolve, reject));
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

    async check(editor, resolve=null, reject=null) {
        if (editor.document.isEmpty) {
            if (reject) reject("empty file");
            return;
        }

        const filePath = nova.workspace.relativizePath(editor.document.path);

        var tmpPath = null;

        if (this.config.get("checkMode") === "onChange") {
            const tmpFilename = await this.getTemporaryFilename(filePath);

            tmpPath = nova.extension.workspaceStoragePath + "/" + tmpFilename;

            const tmpFile = nova.fs.open(tmpPath, "w+t");

            tmpFile.write(
                editor.document.getTextInRange(new Range(0, editor.document.length))
            );
            tmpFile.close();
        }

        const parser = new IssueParser("mypy");

        const process = await this.getProcess(filePath, tmpPath);

        if (!process) {
            if (reject) reject("no process");
            return;
        }

        process.onStdout((output) => parser.pushLine(output));
        process.onStderr((error) => console.error(error));
        process.onDidExit((status) => {
            console.info("Checking " + filePath);

            // NOTE: mypy gives an exclusive range
            for (let issue of parser.issues) {
                if (typeof issue.endColumn !== 'undefined') issue.endColumn += 1;
            }

            // NOTE: Nova version 1.2 and prior has a known bug
            if (nova.version[0] === 1 && nova.version[1] <= 2) {
                for (let issue of parser.issues) {
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
