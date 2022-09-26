# Create/Sync GitHub Issues in Azure DevOps

## Output
id of Azure Work Item that is created/updated

## How to use
1. Add a secret named `AZURE_PAT` containing an [Azure Personal Access Token](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows) with "read & write" permission for Work Items
1. Add workflow file (example below) which responds to issue and issue_comment events. All of the supported types are listed in the example below.
   - Set Azure DevOps organization and project details. (`AZURE_ORG_URL` and `AZURE_PROJECT`)
   - Optional comma separated list of tags to sync (`SYNC_LABELS`). If omitted, all issues will be synced.
   
```
name: Sync TE Labeled GitHub issues to Azure DevOps

on:
  issues:
    types:
      [opened, edited, closed, reopened, labeled, unlabeled]
  issue_comment:
    types: [created]

jobs:
  sync-job:
    runs-on: ubuntu-latest
    steps:
    - uses: buffalodrew/github-actions-issue-to-azure-work-item@main
      env:
        AZURE_PAT: ${{ secrets.AZURE_PAT }}
        AZURE_ORG_URL: https://dev.azure.com/my-azure-org-url
        AZURE_PROJECT: My Azure Project Name
```

## Note
If a GitHub Issue is tagged with `bug` a bug Work Item will be created in Azure DevOps.
