module.exports = {
  labelSleepSeconds: Number(process.env.LABEL_SLEEP_SECONDS || 15),
  syncLabels: process.env.SYNC_LABELS ? process.env.SYNC_LABELS.split(',') : [],
  project: process.env.AZURE_PROJECT,
  areaPath: process.env.AZURE_AREA_PATH,
  iterationPath: process.env.AZURE_ITERATION_PATH,
  orgUrl: process.env.AZURE_ORG_URL,
  azurePersonalAccessToken: process.env.AZURE_PAT,
};
