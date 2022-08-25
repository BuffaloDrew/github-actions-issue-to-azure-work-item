const {
  close,
  comment,
  findOrCreate,
  label,
  reopened,
  unlabel,
  update,
} = require('./client');
const map = require('./payload_mapper');
const { syncLabels, labelSleepSeconds } = require('./config');
const ACTIONS = require('./actions');

const run = async (githubPayload) => {
  const mappedPayload = map(githubPayload);

  const { action, externalId, issueLabels } = mappedPayload;

  let shouldSync = true;

  if (syncLabels.length > 0) {
    shouldSync = issueLabels.some((label) => syncLabels.includes(label));
  }

  if (!shouldSync) {
    console.log(`Skipping ${action} for issue ${externalId}`);
    return null;
  }

  let workItem;

  switch (action) {
    case ACTIONS.OPENED:
      workItem = await findOrCreate(externalId, mappedPayload);
      break;
    case ACTIONS.EDITED:
      workItem = await update(externalId, mappedPayload);
      break;
    case ACTIONS.COMMENT_CREATED:
      workItem = await comment(externalId, mappedPayload);
      break;
    case ACTIONS.CLOSED:
      workItem = await close(externalId, mappedPayload);
      break;
    case ACTIONS.REOPENED:
      workItem = await reopened(externalId, mappedPayload);
      break;
    case ACTIONS.LABELED:
      // When an issue is opened with a label it will run the opened action as well as the
      // labeled action. This is to help mitigate race conditions when they both run concurrently
      await new Promise((resolve) => setTimeout(resolve, labelSleepSeconds));
      workItem = await label(externalId, mappedPayload);
      break;
    case ACTIONS.UNLABELED:
      workItem = await unlabel(externalId, mappedPayload);
      break;
    default:
      console.log(`unhandled action: ${action}`);
  }

  return workItem;
};

module.exports = { run };
