import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { createKbServer } from '../../src/kb/server/kb-server.js';
import { HTTPKBClient } from '../../src/kb/clients/http-kb.client.js';

describe('Standalone KB Server Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createKbServer();
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('responds to GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('interacts seamlessly with HTTPKBClient across all operations', async () => {
    const client = new HTTPKBClient({ baseUrl });

    // 1. List
    const docs = await client.list({ nodePath: '/templates' });
    expect(docs.length).toBeGreaterThanOrEqual(1);

    // 2. Search
    const searchResults = await client.search('customer');
    expect(searchResults.length).toBeGreaterThanOrEqual(1);

    // 3. Retrieve
    const doc = await client.retrieve('doc-001');
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe('Customer Response Template');

    // 4. Add
    const created = await client.add({
      title: 'Server Test Template',
      content: 'Server content',
      nodePath: '/templates/server',
      tags: ['server', 'test']
    });
    expect(created.id).toBeDefined();

    const retrievedCreated = await client.retrieve(created.id);
    expect(retrievedCreated?.title).toBe('Server Test Template');
  });
});
