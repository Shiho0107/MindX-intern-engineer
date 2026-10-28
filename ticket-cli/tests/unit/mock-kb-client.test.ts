import { describe, it, expect, beforeEach } from 'vitest';
import { MockKBClient } from '../../src/kb/clients/mock-kb.client.js';
import { KBValidationError } from '../../src/kb/errors/kb-errors.js';

describe('MockKBClient Unit Tests', () => {
  let client: MockKBClient;

  beforeEach(() => {
    client = new MockKBClient();
  });

  describe('Initial Seed Data', () => {
    it('initializes with seed documents covering templates, team info, and guides', async () => {
      const docs = await client.list();
      expect(docs.length).toBeGreaterThanOrEqual(3);

      const paths = docs.map(d => d.nodePath);
      expect(paths).toContain('/templates/email');
      expect(paths).toContain('/team/devops');
      expect(paths).toContain('/docs/guides');
    });
  });

  describe('list()', () => {
    it('returns all documents up to the default limit', async () => {
      const docs = await client.list();
      expect(docs.length).toBe(3);
    });

    it('filters documents by nodePath hierarchy', async () => {
      const emailTemplates = await client.list({ nodePath: '/templates/email' });
      expect(emailTemplates.length).toBe(1);
      expect(emailTemplates[0].id).toBe('doc-001');

      const allTemplates = await client.list({ nodePath: '/templates' });
      expect(allTemplates.length).toBe(1);

      const emptyList = await client.list({ nodePath: '/nonexistent/path' });
      expect(emptyList).toEqual([]);
    });

    it('respects the limit option', async () => {
      const docs = await client.list({ limit: 2 });
      expect(docs.length).toBe(2);
    });
  });

  describe('search()', () => {
    it('finds documents matching title keywords (case-insensitive)', async () => {
      const results = await client.search('response');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('doc-001');
      expect(results[0].title).toContain('Customer Response Template');
      expect(results[0].matchType).toBe('title');
    });

    it('finds documents matching tags', async () => {
      const results = await client.search('devops');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('doc-002');
      expect(results[0].matchType).toBe('tag');
    });

    it('finds documents matching body content', async () => {
      const results = await client.search('authorization');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('doc-003');
      expect(results[0].matchType).toBe('content');
      expect(results[0].snippet).toBeDefined();
    });

    it('respects topK option', async () => {
      // Query that matches multiple items (e.g. markdown header or common words)
      const results = await client.search('the', { topK: 1 });
      expect(results.length).toBe(1);
    });

    it('returns empty array when query has no matches', async () => {
      const results = await client.search('xyzNonExistentKeyword999');
      expect(results).toEqual([]);
    });
  });

  describe('retrieve()', () => {
    it('retrieves an existing document by ID', async () => {
      const doc = await client.retrieve('doc-001');
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe('doc-001');
      expect(doc?.title).toBe('Customer Response Template');
      expect(doc?.nodePath).toBe('/templates/email');
      expect(doc?.tags).toEqual(['template', 'email', 'support']);
      expect(doc?.content).toContain('Dear {{customer_name}}');
    });

    it('returns null when document ID does not exist', async () => {
      const doc = await client.retrieve('doc-999');
      expect(doc).toBeNull();
    });
  });

  describe('add()', () => {
    it('adds a new document with sequential ID and returns it', async () => {
      const newDoc = await client.add({
        title: 'SMS Notification Template',
        content: 'Your order {{order_id}} has been shipped!',
        nodePath: '/templates/sms',
        tags: ['template', 'sms', 'shipping']
      });

      expect(newDoc.id).toBe('doc-004');
      expect(newDoc.title).toBe('SMS Notification Template');
      expect(newDoc.nodePath).toBe('/templates/sms');
      expect(newDoc.tags).toEqual(['template', 'sms', 'shipping']);

      // Check retrievable
      const retrieved = await client.retrieve('doc-004');
      expect(retrieved).toEqual(newDoc);

      // Check searchable
      const searchResults = await client.search('shipped');
      expect(searchResults.some(r => r.id === 'doc-004')).toBe(true);

      // Check listed
      const listed = await client.list({ nodePath: '/templates/sms' });
      expect(listed.length).toBe(1);
      expect(listed[0].id).toBe('doc-004');
    });

    it('normalizes tags by trimming and removing empty items', async () => {
      const newDoc = await client.add({
        title: 'Tag Test Document',
        content: 'Testing tag normalization',
        nodePath: '/docs/test',
        tags: ['  billing ', '', '   ', 'invoice  ']
      });

      expect(newDoc.tags).toEqual(['billing', 'invoice']);
    });

    it('throws KBValidationError if title is empty or whitespace', async () => {
      await expect(
        client.add({
          title: '   ',
          content: 'Some content',
          nodePath: '/docs/general'
        })
      ).rejects.toThrow(KBValidationError);
    });

    it('throws KBValidationError if content is empty or whitespace', async () => {
      await expect(
        client.add({
          title: 'Title',
          content: '   ',
          nodePath: '/docs/general'
        })
      ).rejects.toThrow(KBValidationError);
    });

    it('throws KBValidationError if nodePath does not start with "/"', async () => {
      await expect(
        client.add({
          title: 'Title',
          content: 'Content',
          nodePath: 'invalid/path'
        })
      ).rejects.toThrow(KBValidationError);
    });
  });
});
