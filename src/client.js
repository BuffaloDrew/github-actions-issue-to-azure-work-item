require('dotenv').config();
const showdown = require('showdown');
const azdev = require('azure-devops-node-api');
const {
  areaPath,
  azurePersonalAccessToken,
  iterationPath,
  orgUrl,
  project,
} = require('./config');

const authHandler = azdev.getPersonalAccessTokenHandler(
  azurePersonalAccessToken
);
const connection = new azdev.WebApi(orgUrl, authHandler);

async function findById(id) {
  const client = await connection.getWorkItemTrackingApi();
  return await client.getWorkItem(id);
}

async function findByExternalId(externalId, repoShortName) {
  const client = await connection.getWorkItemTrackingApi();
  const wiql = {
    query:
      "SELECT [System.Id], [System.WorkItemType], [System.Description], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM workitems WHERE [System.TeamProject] = @project AND [System.Title] CONTAINS '(GitHub Issue #" +
      externalId +
      ")' AND [System.Tags] CONTAINS 'GitHub Issue' AND [System.Tags] CONTAINS '" +
      repoShortName +
      "'",
  };

  const queryResult = await client.queryByWiql(wiql, {
    project,
  });

  const workItem =
    queryResult.workItems.length > 0 ? queryResult.workItems[0] : null;

  if (workItem) {
    return await findById(workItem.id);
  }

  return null;
}

async function create(externalId, body, isBug = false) {
  const { githubOptions, title, description, issueLabels } = body;
  const converter = new showdown.Converter();
  const html = converter.makeHtml(description);

  const patchDocument = [
    {
      op: 'add',
      path: '/fields/System.Title',
      value: title + ` (GitHub Issue #${externalId})`,
    },
    {
      op: 'add',
      path: '/fields/System.Description',
      value: html,
    },
    {
      op: 'add',
      path: '/fields/Microsoft.VSTS.TCM.ReproSteps',
      value: html,
    },
    {
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'Hyperlink',
        url: githubOptions.issueUrl,
      },
    },
    {
      op: 'add',
      path: '/fields/System.History',
      value: `GitHub <a href="${githubOptions.issueUrl}" target="_new">issue #${externalId}</a> created in <a href="${githubOptions.repoUrl}" target="_new">${githubOptions.repoFullName}</a> by ${githubOptions.user}`,
    },
    {
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.StackRank',
      value: 1,
    },
    {
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.BacklogPriority',
      value: 1,
    },
    {
      op: 'add',
      path: '/fields/System.CreatedBy',
      value: githubOptions.user,
    },
  ];

  const baseTags = ['GitHub Issue', githubOptions.repoShortName, ...issueLabels];

  patchDocument.push({
    op: 'add',
    path: '/fields/System.Tags',
    value: baseTags.join('; '),
  });

  if (areaPath) {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.AreaPath',
      value: areaPath,
    });
  }

  if (iterationPath) {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.IterationPath',
      value: iterationPath,
    });
  }

  const client = await connection.getWorkItemTrackingApi();
  return await client.createWorkItem(
    [],
    patchDocument,
    project,
    isBug ? 'Bug' : 'User Story',
    false,
    true
  );
}

async function patchWorkItemById(patchDocument, id) {
  const client = await connection.getWorkItemTrackingApi();
  return await client.updateWorkItem(
    [],
    patchDocument,
    id,
    project,
    false,
    true
  );
}

async function update(externalId, body) {
  const { title, description } = body;
  const workItem = await findOrCreate(externalId, body);

  const updatedDescription = description.trim();
  const converter = new showdown.Converter();
  const html = converter.makeHtml(updatedDescription);

  const patchDocument = [];

  if (
    workItem.fields['System.Title'] !== `${title} (GitHub Issue #${externalId})`
  ) {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.Title',
      value: title + ' (GitHub Issue #' + externalId + ')',
    });
  }

  const descriptionFieldsChanged =
    workItem.fields['System.Description'] !== html ||
    workItem.fields['Microsoft.VSTS.TCM.ReproSteps'] !== html;

  if (descriptionFieldsChanged) {
    patchDocument.push(
      {
        op: 'add',
        path: '/fields/System.Description',
        value: html,
      },
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.TCM.ReproSteps',
        value: html,
      }
    );
  }

  if (patchDocument.length > 0) {
    return await patchWorkItemById(patchDocument, workItem.id);
  }
}

async function createBug(externalId, body) {
  return await create(externalId, body, true);
}

async function createUserStory(externalId, body) {
  return await create(externalId, body);
}

async function findOrCreate(externalId, body, isBug = false) {
  const workItem = await findByExternalId(
    externalId,
    body.githubOptions.repoShortName
  );

  if (workItem) {
    return workItem;
  } else {
    if (isBug) {
      return await createBug(externalId, body);
    } else {
      return await createUserStory(externalId, body);
    }
  }
}

async function comment(externalId, body) {
  const { githubOptions, commentText, commentUrl } = body;
  const workItem = await findOrCreate(externalId, body);

  const converter = new showdown.Converter();
  const html = converter.makeHtml(commentText);

  const patchDocument = [];

  if (commentText != '') {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.History',
      value: `<a href="${commentUrl}" target="_new">GitHub issue comment added</a> by ${githubOptions.user}</br></br>${html}`,
    });
  }

  return await patchWorkItemById(patchDocument, workItem.id);
}

async function label(externalId, body) {
  const { label } = body;
  const workItem = await findOrCreate(externalId, body);

  const patchDocument = [];

  const workItemTags = workItem.fields['System.Tags'].split('; ');

  if (!workItemTags.includes(label)) {
    patchDocument.push({
      op: 'replace',
      path: '/fields/System.Tags',
      value:
        workItem.fields['System.Tags'] +
        '; ' +
        label,
    });

    if (label === 'bug') {
      patchDocument.push({
        op: 'add',
        path: '/fields/System.WorkItemType',
        value: 'Bug',
      });
    }
  }

  if (patchDocument.length > 0) {
    return await patchWorkItemById(patchDocument, workItem.id);
  }

  return workItem;
}

async function unlabel(externalId, body) {
  const { label } = body;
  const workItem = await findOrCreate(externalId, body);

  const patchDocument = [];

  const workItemTags = workItem.fields['System.Tags'].split('; ');

  if (workItemTags.includes(label)) {
    const str = workItem.fields['System.Tags'];
    const res = str.replace(label + '; ', '');

    patchDocument.push({
      op: 'replace',
      path: '/fields/System.Tags',
      value: res,
    });
  }

  if (label === 'bug') {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.WorkItemType',
      value: 'User Story',
    });
  }

  return await patchWorkItemById(patchDocument, workItem.id);
}

async function close(externalId, body) {
  const { githubOptions } = body;
  const workItem = await findOrCreate(externalId, body);

  const patchDocument = [];

  if (body.closedAt) {
    patchDocument.push({
      op: 'add',
      path: '/fields/System.History',
      value: `GitHub <a href="${githubOptions.issueUrl}" target="_new">issue #${externalId}</a> closed by ${githubOptions.user}`,
    });
  }
  const result = await patchWorkItemById(patchDocument, workItem.id);
  return result;
}

async function reopened(externalId, body) {
  const { githubOptions } = body;
  const workItem = await findOrCreate(externalId, body);

  const patchDocument = [];

  patchDocument.push({
    op: 'add',
    path: '/fields/System.History',
    value: `GitHub issue reopened by ${githubOptions.user}`,
  });

  return await patchWorkItemById(patchDocument, workItem.id);
}

async function destroy(externalId, repoShortName) {
  const workItem = await findByExternalId(externalId, repoShortName);

  if (workItem) {
    const client = await connection.getWorkItemTrackingApi();
    await client.deleteWorkItem(workItem.id, project);
  }

  return true;
}

module.exports = {
  close,
  comment,
  create,
  findOrCreate,
  destroy,
  findByExternalId,
  label,
  reopened,
  unlabel,
  update,
};
