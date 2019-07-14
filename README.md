# Best of JavaScript back-end tasks

This repository contains [Best of JavaScript](https://bestofjs.org/) back-end tasks run every day to update the database and build JSON files consumed by the web applications.

Tasks can be launched from the command line and scheduled on CI servers.

A "task" is just a Node.js JavaScript file that can be launched using `node` executable.

```
node cli/tasks/<task-parent-folder>
```

Examples:

```shell
node cli/tasks/projects/update --loglevel debug --limit 1
```

Available options:

- `--loglevel info|verbose|debug` specify the log level
- `--name <project_name>` process only the project with the specified repository **name**, instead of all projects
- `--id <project_id>` process only the project with the specified **id**, instead of all projects
- `--db <key>` connect to a database whose URL is specified in the .env file `MONGO_URI_<KEY>`
- `--readonly` run the batch in readonly mode, no database write operation
- `--limit <integer>` limit the number of items processed
