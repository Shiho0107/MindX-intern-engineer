import { IKBClient } from './kb-client.interface.js';
import { MockKBClient } from './mock-kb.client.js';
import { HTTPKBClient } from './http-kb.client.js';

export interface CreateKBClientOptions {
  type?: 'mock' | 'http';
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export function createKBClient(options: CreateKBClientOptions = {}): IKBClient {
  const envType = process.env.KB_CLIENT_TYPE?.toLowerCase().trim();
  const envUrl = process.env.KB_API_URL?.trim();

  let resolvedType: 'mock' | 'http' = 'mock';

  if (options.type) {
    resolvedType = options.type;
  } else if (envType === 'http') {
    resolvedType = 'http';
  } else if (envType === 'mock') {
    resolvedType = 'mock';
  } else if (options.baseUrl || (envUrl && envUrl.length > 0)) {
    resolvedType = 'http';
  }

  if (resolvedType === 'http') {
    const baseUrl = options.baseUrl || envUrl || 'http://localhost:3000';
    return new HTTPKBClient({
      baseUrl,
      timeoutMs: options.timeoutMs,
      fetch: options.fetch
    });
  }

  return new MockKBClient();
}
