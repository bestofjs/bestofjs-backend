# Best of JavaScript back-end tasks

This repository contains [Best of JavaScript](https://bestofjs.org/) back-end tasks run every day to update the database and build JSON files consumed by the web applications.

Tasks can be launched from the command line and scheduled on CI servers.

A "task" is just a Node.js JavaScript file that can be launched using the task runner `run.js` at the root level:

```
node ./run.js <path-to-task.task.js> <options>
```

Example:

```shell
node ./run.js ./cli/tasks/projects/update-github-data.task.js --loglevel debug --limit 1
```

Available options:

- `--loglevel info|verbose|debug` specify the log level
- `--name <project_name>` process only the project with the specified repository **name**, instead of all projects
- `--id <project_id>` process only the project with the specified **id**, instead of all projects
- `--db <key>` connect to a database whose URL is specified in the .env file `MONGO_URI_<KEY>`
- `--readonly` run the batch in readonly mode, no database write operation
- `--limit <integer>` limit the number of items processed
