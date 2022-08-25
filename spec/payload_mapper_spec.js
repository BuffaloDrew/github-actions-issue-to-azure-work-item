const map = require('../src/payload_mapper');

it('should map a payload', () => {
  const payload = {
    action: 'opened',
    issue: {
      number: 1,
      title: 'test title',
      state: 'open',
      body: 'test body',
      closed_at: null,
      user: {
        login: 'test user',
      },
      html_url: 'https://html_url.com',
    },
    repository: {
      html_url: 'https://test.com',
      full_name: 'test/test',
    },
    label: {
      name: 'test label',
    },
    comment: {
      body: 'test comment',
      html_url: 'https://test-comment.com',
    },
    issue: {
      labels: [{ name: 'test label' }],
      title: 'test title',
      number: 1,
      body: 'test body',
      closed_at: null,
      user: {
        login: 'test user',
      },
      html_url: 'https://html_url.com',
    },
    repository: {
      html_url: 'https://test.com',
        full_name: 'test/test',
    },
  };
  const mapped = map(payload);

  expect(mapped.externalId).toBe(1);
  expect(mapped.title).toBe('test title');
  expect(mapped.description).toBe('test body');
  expect(mapped.closedAt).toBe(null);
  expect(mapped.label).toBe('test label');
  expect(mapped.commentText).toBe('test comment');
  expect(mapped.commentUrl).toBe('https://test-comment.com');
  expect(mapped.user).toBe('test user');
  expect(mapped.issueLabels).toEqual(['test label']);
  expect(mapped.githubOptions.issueUrl).toBe('https://html_url.com');
  expect(mapped.githubOptions.repoUrl).toBe('https://test.com');
  expect(mapped.githubOptions.repoFullName).toBe('test/test');
  expect(mapped.githubOptions.repoShortName).toBe('test');
  expect(mapped.githubOptions.user).toBe('test user');
});
