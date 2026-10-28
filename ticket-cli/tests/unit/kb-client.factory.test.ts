import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createKBClient } from '../../src/kb/clients/kb-client.factory.js';
import { MockKBClient } from '../../src/kb/clients/mock-kb.client.js';
import { HTTPKBClient } from '../../src/kb/clients/http-kb.client.js';

describe('createKBClient Factory Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.KB_CLIENT_TYPE;
    delete process.env.KB_API_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to MockKBClient when no options or environment variables are set', () => {
    const client = createKBClient();
    expect(client).toBeInstanceOf(MockKBClient);
  });

  it('creates MockKBClient when type is explicitly "mock"', () => {
    const client = createKBClient({ type: 'mock' });
    expect(client).toBeInstanceOf(MockKBClient);
  });

  it('creates HTTPKBClient when type is explicitly "http"', () => {
    const client = createKBClient({ type: 'http', baseUrl: 'http://localhost:8080' });
    expect(client).toBeInstanceOf(HTTPKBClient);
  });

  it('swaps to HTTPKBClient when KB_CLIENT_TYPE="http"', () => {
    process.env.KB_CLIENT_TYPE = 'http';
    process.env.KB_API_URL = 'http://api.kb.mindx.edu.vn';

    const client = createKBClient();
    expect(client).toBeInstanceOf(HTTPKBClient);
  });

  it('swaps to MockKBClient when KB_CLIENT_TYPE="mock" even if KB_API_URL is set', () => {
    process.env.KB_CLIENT_TYPE = 'mock';
    process.env.KB_API_URL = 'http://api.kb.mindx.edu.vn';

    const client = createKBClient();
    expect(client).toBeInstanceOf(MockKBClient);
  });
});
