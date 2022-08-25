const map = (payload) => {
  const issueLabels = (payload?.issue?.labels || []).map((label) => label.name);
  return {
    action: payload.action,
    externalId: payload.issue.number !== undefined ? payload.issue.number : -1,
    title: payload?.issue?.title || 'No title provided',
    description: payload?.issue?.body || 'No description provided',
    closedAt: payload?.issue?.closed_at,
    label: payload?.label?.name,
    issueLabels,
    commentText: payload?.comment?.body,
    commentUrl: payload?.comment?.html_url,
    githubOptions: {
      issueUrl: payload?.issue?.html_url,
      repoUrl: payload?.repository?.html_url,
      repoFullName: payload?.repository?.full_name,
      repoShortName: payload?.repository?.full_name?.split('/')[1],
      user: payload?.issue?.user?.login,
    },
    user: payload?.issue?.user?.login,
  };
};

module.exports = map;
