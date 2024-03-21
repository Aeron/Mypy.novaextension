const utils = require("./utils");

class IssueProvider {
    constructor(config) {
        this.config = config;
        this.issueCollection = new IssueCollection("mypy");
        this.parser = new IssueParser("mypy");
    }

    getProcessOptions(filePath, tmpPath = null) {
        const defaultOptions = (tmpPath)
            ? ["--shadow-file", filePath, tmpPath] // NOTE: better have the `=` notation but how?
            : [];
        const commandArguments = this.config.commandArguments();
        const extraOptions = utils.normalizeOptions(commandArguments);

        const pythonExecutablePath = this.config.pythonExecutablePath();
        const execOptions = (pythonExecutablePath)
            ? [`--python-executable=${pythonExecutablePath}`]
            : [];

        return Array.from(new Set([...extraOptions, ...execOptions, ...defaultOptions]));
    }

    getProcess(filePath, tmpPath = null) {
        const executablePath = nova.path.expanduser(this.config.executablePath());

        if (!nova.fs.stat(executablePath)) {
            console.error(`Executable ${executablePath} does not exist`);
            return;
        }

        const options = this.getProcessOptions(filePath, tmpPath);

        return new Process(
            executablePath,
            {
                args: [...options, filePath],
                stdio: ["ignore", "pipe", "pipe"],
                cwd: nova.workspace.path,  // NOTE: must be explicitly set
            }
        );
    }

    provideIssues(editor) {
        return new Promise((resolve, reject) => this.check(editor, resolve, reject));
    }

    getTemporaryFilename(filePath) {
        var hash = 0;

        if (filePath.length > 0) {
            for (let char of filePath) {
                hash = ((hash << 5) - hash) + char.charCodeAt(0);
                hash = hash & hash;
            }
        }

        return `${hash}.${Date.now()}.tmp`;
    }

    check(editor, resolve = null, reject = null) {
        if (editor.document.isEmpty) {
            if (reject) reject("empty file");
            return;
        }

        const filePath = nova.workspace.relativizePath(editor.document.path);

        var tmpPath = null;

        if (this.config.checkMode() === "onChange") {
            tmpPath = nova.extension.workspaceStoragePath + "/" + this.getTemporaryFilename(filePath);

            const tmpFile = nova.fs.open(tmpPath, "w+t");

            tmpFile.write(
                editor.document.getTextInRange(new Range(0, editor.document.length))
            );
            tmpFile.close();
        }

        const process = this.getProcess(filePath, tmpPath);

        if (!process) {
            if (reject) reject("no process");
            return;
        }

        process.onStdout((output) => this.parser.pushLine(output));
        process.onStderr((error) => console.error(error));
        process.onDidExit((status) => {
            console.info(`Checking ${filePath}`);

            // NOTE: mypy gives an exclusive range
            for (let issue of this.parser.issues) {
                if (typeof issue.endColumn !== "undefined") issue.endColumn += 1;
            }

            // NOTE: Nova version 1.2 and prior has a known bug
            if (nova.version[0] === 1 && nova.version[1] <= 2) {
                for (let issue of this.parser.issues) {
                    issue.line += 1;
                    issue.column += 1;
                }
            }

            console.info(`Found ${this.parser.issues.length} issue(s)`);

            if (tmpPath) {
                nova.fs.remove(tmpPath);
            }

            this.issueCollection.set(editor.document.uri, this.parser.issues);
            this.parser.clear();

            // HACK: nova.assistants.registerIssueAssistant uses its own private and
            // nameless IssueCollection, and that leads to issue duplication between
            // the command and on-save check. So, we give it nothing, and keep using
            // our explicit IssueCollection.
            if (resolve) resolve();
        });

        console.info(`Running ${process.command} ${process.args.join(" ")}`);

        process.start();
    }
}

module.exports = IssueProvider;
