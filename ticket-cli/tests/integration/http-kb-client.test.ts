import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { HTTPKBClient } from '../../src/kb/clients/http-kb.client.js';
import { KBDocument } from '../../src/kb/models/kb-document.js';
import { KBConnectionError, KBError, KBValidationError } from '../../src/kb/errors/kb-errors.js';

describe('HTTPKBClient Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  const mockDb: KBDocument[] = [
    {
      id: 'doc-001',
      title: 'Customer Response Template',
      content: 'Dear {{customer_name}}, thank you for contacting us.',
      nodePath: '/templates/email',
      tags: ['template', 'email']
    },
    {
      id: 'doc-002',
      title: 'DevOps On-Call Schedule',
      content: 'Primary engineer: Alex, Secondary: Chi',
      nodePath: '/team/devops',
      tags: ['team', 'devops']
    }
  ];

  beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', () => {
        const url = req.url ?? '/';
        const parsedBody = body ? JSON.parse(body) : {};

        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'POST' && url === '/search') {
          const query = (parsedBody.query || '').toLowerCase();
          const topK = parsedBody.topK ?? 5;
          const results = mockDb
            .filter(d => d.title.toLowerCase().includes(query) || d.content.toLowerCase().includes(query))
            .slice(0, topK)
            .map(d => ({
              id: d.id,
              title: d.title,
              nodePath: d.nodePath,
              tags: d.tags
            }));
          res.writeHead(200);
          res.end(JSON.stringify({ results }));
          return;
        }

        if (req.method === 'POST' && url === '/list') {
          const nodePath = parsedBody.nodePath;
          const limit = parsedBody.limit ?? 10;
          let docs = mockDb;
          if (nodePath) {
            docs = docs.filter(d => d.nodePath.startsWith(nodePath));
          }
          res.writeHead(200);
          res.end(JSON.stringify({ documents: docs.slice(0, limit) }));
          return;
        }

        if (req.method === 'POST' && url === '/retrieve') {
          const doc = mockDb.find(d => d.id === parsedBody.docId);
          if (!doc) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Document not found' }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ document: doc }));
          return;
        }

        if (req.method === 'POST' && url === '/add') {
          if (!parsedBody.title || !parsedBody.content || !parsedBody.nodePath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }
          const created: KBDocument = {
            id: `doc-${String(mockDb.length + 1).padStart(3, '0')}`,
            title: parsedBody.title,
            content: parsedBody.content,
            nodePath: parsedBody.nodePath,
            tags: parsedBody.tags ?? []
          };
          mockDb.push(created);
          res.writeHead(201);
          res.end(JSON.stringify({ document: created }));
          return;
        }

        if (url === '/error') {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('searches documents via POST /search', async () => {
    const client = new HTTPKBClient({ baseUrl });
    const results = await client.search('response');

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('doc-001');
    expect(results[0].title).toBe('Customer Response Template');
  });

  it('lists documents via POST /list', async () => {
    const client = new HTTPKBClient({ baseUrl });
    const docs = await client.list({ nodePath: '/templates' });

    expect(docs.length).toBe(1);
    expect(docs[0].id).toBe('doc-001');
  });

  it('retrieves an existing document via POST /retrieve', async () => {
    const client = new HTTPKBClient({ baseUrl });
    const doc = await client.retrieve('doc-001');

    expect(doc).not.toBeNull();
    expect(doc?.id).toBe('doc-001');
    expect(doc?.content).toContain('Dear {{customer_name}}');
  });

  it('returns null when document is not found (HTTP 404)', async () => {
    const client = new HTTPKBClient({ baseUrl });
    const doc = await client.retrieve('doc-999');

    expect(doc).toBeNull();
  });

  it('adds a new document via POST /add', async () => {
    const client = new HTTPKBClient({ baseUrl });
    const created = await client.add({
      title: 'HTTP Added Document',
      content: 'Added over HTTP API',
      nodePath: '/docs/api',
      tags: ['api', 'http']
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('HTTP Added Document');

    const retrieved = await client.retrieve(created.id);
    expect(retrieved?.title).toBe('HTTP Added Document');
  });

  it('throws KBValidationError when server returns HTTP 400', async () => {
    const client = new HTTPKBClient({ baseUrl });
    await expect(
      client.add({
        title: '',
        content: '',
        nodePath: ''
      })
    ).rejects.toThrow(KBValidationError);
  });

  it('throws KBConnectionError when server is unreachable', async () => {
    const client = new HTTPKBClient({ baseUrl: 'http://127.0.0.1:59999' }); // Unused port
    await expect(client.search('test')).rejects.toThrow(KBConnectionError);
  });
});
