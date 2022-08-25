const { run } = require('../src/sync');
const { destroy } = require('../src/client');
const {
  CLOSED,
  COMMENT_CREATED,
  EDITED,
  LABELED,
  OPENED,
  REOPENED,
  TEST_EXTERNAL_ID,
  UNLABELED,
} = require('./github_action_test_payloads');

const REPO_SHORT_NAME = 'test'

describe('sync', () => {
  jest.setTimeout(20 * 1000);
  describe('work item does not exist', () => {
    afterEach(async () => {
      await destroy(TEST_EXTERNAL_ID, REPO_SHORT_NAME);
    });
    it('creates a work item', async () => {
      const workItem = await run(OPENED);
      expect(workItem.id).toBeDefined();
      expect(workItem.fields['System.Title']).toContain(OPENED.issue.title);
      expect(workItem.fields['System.Tags']).toContain(REPO_SHORT_NAME);
      expect(workItem.fields['System.Tags']).toContain('GitHub Issue');
      expect(workItem.fields['System.Description']).toContain(
        OPENED.issue.body
      );
    });

    it('creates a work item with a label', async () => {
      const workItem = await run({
        ...OPENED,
        issue: { ...OPENED.issue, labels: [{ name: 'this is a label' }] },
      });
      const workItemTags = workItem.fields['System.Tags'].split('; ');
      expect(workItemTags).toContain('this is a label');
    });

    it('should label a work item', async () => {
      const workItem = await run(LABELED);
      const workItemTags = workItem.fields['System.Tags'].split('; ');

      expect(workItemTags).toContain(LABELED.label.name);
    });

    it('should comment on a work item', async () => {
      const workItem = await run(COMMENT_CREATED);
      expect(workItem.fields['System.History']).toContain(
        COMMENT_CREATED.comment.body
      );
    });

    it('should close a work item', async () => {
      const workItem = await run(CLOSED);
      expect(workItem.fields['System.History']).toContain('closed by');
    });

    it('should reopen a work item', async () => {
      const workItem = await run(REOPENED);
      expect(workItem.fields['System.History']).toContain('reopened by');
    });

    it.todo('should unlabel a work item');

    it('should update a work item', async () => {
      const workItem = await run(EDITED);
      expect(workItem.fields['System.Title']).toContain(EDITED.issue.title);
      expect(workItem.fields['System.Description']).toContain(
        EDITED.issue.body
      );
    });
  });
});
