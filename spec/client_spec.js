const {
  close,
  comment,
  destroy,
  findByExternalId,
  label,
  reopened,
  unlabel,
  update,
  create,
} = require('../src/client');

const EXTERNAL_ID = 'TEST_EXTERNAL_ID';

const BODY = {
  title: 'test title',
  description: 'test description',
  githubOptions: {
    user: 'user',
    issueUrl: 'https://test.com',
    repoUrl: 'https://test.com',
    repoFullName: 'test/test',
    repoShortName: 'test',
  },
};

describe('client', () => {
  jest.setTimeout(20 * 1000);

  describe('work items', () => {
    describe('creating a work item', () => {
      afterEach(async () => {
        await destroy(EXTERNAL_ID, BODY.githubOptions.repoShortName);
      });

      function workItemExpects(workItem, workItemType) {
        expect(workItem.fields['System.State']).toBe('New');
        expect(workItem.fields['System.Title']).toBe(
          `${BODY.title} (GitHub Issue #${EXTERNAL_ID})`
        );
        expect(workItem.fields['System.Description']).toContain(
          'test description'
        );
        expect(workItem.fields['System.WorkItemType']).toBe(workItemType);
        expect(workItem.fields['System.Tags']).toBe('GitHub Issue; test');
      }

      it('should create a user story', async () => {
        const workItem = await create(EXTERNAL_ID, BODY);
        workItemExpects(workItem, 'User Story');
      });

      it('should create a bug work item', async () => {
        const workItem = await create(EXTERNAL_ID, BODY, 'bug');
        workItemExpects(workItem, 'Bug');
      });
    });

    describe('destroying a work item', () => {
      beforeEach(async () => {
        await create(EXTERNAL_ID, BODY);
      });

      it('should destroy a work item', async () => {
        await destroy(EXTERNAL_ID, BODY.githubOptions.repoShortName);
        const workItem = await findByExternalId(EXTERNAL_ID);
        expect(workItem).toBe(null);
      });
    });

    describe('finding a work item', () => {
      beforeEach(async () => {
        await create(EXTERNAL_ID, BODY);
      });

      afterEach(async () => {
        await destroy(EXTERNAL_ID, BODY.githubOptions.repoShortName);
      });

      it('should find a work item', async () => {
        const workItem = await findByExternalId(EXTERNAL_ID);
        expect(workItem).toBeDefined();
      });
    });
    describe('updating a work item', () => {
      beforeEach(async () => {
        await create(EXTERNAL_ID, BODY);
        await label(EXTERNAL_ID, { label: 'label to be removed' });
      });

      afterEach(async () => {
        await destroy(EXTERNAL_ID, BODY.githubOptions.repoShortName);
      });

      it('should update the work item description and title', async () => {
        const workItem = await update(EXTERNAL_ID, {
          title: 'updated title',
          description: 'updated description',
        });
        expect(workItem.fields['System.Title']).toBe(
          `updated title (GitHub Issue #${EXTERNAL_ID})`
        );
        expect(workItem.fields['System.Description']).toContain(
          'updated description'
        );
      });

      it('should label the work item', async () => {
        const result = await label(EXTERNAL_ID, { label: 'added label' });
        expect(result.fields['System.Tags']).toContain('added label');
      });

      it('should change work item type to bug if label is bug', async () => {
        const result = await label(EXTERNAL_ID, { label: 'bug' });
        expect(result.fields['System.WorkItemType']).toBe('Bug');
      });

      it('should change work item type to user story if bug is removed', async () => {
        const result = await unlabel(EXTERNAL_ID, { label: 'bug' });
        expect(result.fields['System.WorkItemType']).toBe('User Story');
      });

      it('should unlabel the work item', async () => {
        const result = await unlabel(EXTERNAL_ID, {
          label: 'label to be removed',
        });
        expect(result.fields['System.Tags']).not.toContain(
          'label to be removed'
        );
        expect(result.fields['System.Tags']).toContain('GitHub Issue');
        expect(result.fields['System.Tags']).toContain('test');
      });

      it('should add a comment', async () => {
        const result = await comment(EXTERNAL_ID, {
          ...BODY,
          commentText: 'added comment',
          commentUrl: 'https://test.com',
        });
        expect(result.fields['System.History']).toContain('added comment');
        expect(result.fields['System.History']).toContain('https://test.com');
      });

      it('add history if issue is closed', async () => {
        const result = await close(EXTERNAL_ID, {
          ...BODY,
          closedAt: '2020-01-01',
        });
        expect(result.fields['System.History']).toContain('closed by');
      });

      it('should add history if issue is reopened', async () => {
        const result = await reopened(EXTERNAL_ID, BODY);
        expect(result.fields['System.History']).toContain('reopened by');
      });
    });
  });
});
