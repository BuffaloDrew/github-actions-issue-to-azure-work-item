const core = require('@actions/core');
const github = require('@actions/github');
const { run } = require('./src/sync');

run(github.context.payload)
  .then((workItem) => {
    core.setOutput(`id`, `${workItem?.id}`);
  })
  .catch((error) => {
    console.log(error);
    // core.setFailed(error);
  });
