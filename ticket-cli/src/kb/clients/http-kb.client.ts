import { IKBClient } from './kb-client.interface.js';
import {
  KBDocument,
  KBSearchResult,
  AddDocumentDTO,
  SearchOptions,
  ListOptions
} from '../models/kb-document.js';
import {
  KBConnectionError,
  KBError,
  KBValidationError
} from '../errors/kb-errors.js';

export interface HTTPKBClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class HTTPKBClient implements IKBClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly customFetch: typeof fetch;

  constructor(options: HTTPKBClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.customFetch = options.fetch ?? globalThis.fetch;
  }

  private async post<T>(
    endpoint: string,
    payload: Record<string, unknown>,
    allow404 = false
  ): Promise<{ data: T | null; status: number }> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.customFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message = (err as Error).message ?? 'Unknown connection failure';
      throw new KBConnectionError(
        `Failed to connect to Knowledge Base API at "${this.baseUrl}": ${message}`,
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 404 && allow404) {
      return { data: null, status: 404 };
    }

    let parsed: any = null;
    try {
      parsed = await res.json();
    } catch {
      // Body may not be JSON
    }

    if (!res.ok) {
      const errorMessage =
        parsed?.error || parsed?.message || `HTTP ${res.status}: ${res.statusText}`;

      if (res.status === 400) {
        throw new KBValidationError(errorMessage);
      }
      throw new KBError(`Knowledge Base API Error (${res.status}): ${errorMessage}`);
    }

    return { data: parsed as T, status: res.status };
  }

  async search(query: string, options?: SearchOptions): Promise<KBSearchResult[]> {
    const payload = {
      query: query.trim(),
      topK: options?.topK ?? 5
    };

    const { data } = await this.post<{ results?: KBSearchResult[] }>('/search', payload);
    return data?.results ?? [];
  }

  async list(options?: ListOptions): Promise<KBDocument[]> {
    const payload: Record<string, unknown> = {
      limit: options?.limit ?? 10
    };
    if (options?.nodePath) {
      payload.nodePath = options.nodePath;
    }

    const { data } = await this.post<{ documents?: KBDocument[]; results?: KBDocument[] }>(
      '/list',
      payload
    );
    return data?.documents ?? data?.results ?? [];
  }

  async retrieve(docId: string): Promise<KBDocument | null> {
    const { data, status } = await this.post<{ document?: KBDocument }>(
      '/retrieve',
      { docId },
      true
    );

    if (status === 404 || !data) {
      return null;
    }
    return data.document ?? null;
  }

  async add(dto: AddDocumentDTO): Promise<KBDocument> {
    if (!dto.title || !dto.title.trim()) {
      throw new KBValidationError('Document title is required and cannot be empty');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new KBValidationError('Document content is required and cannot be empty');
    }
    if (!dto.nodePath || !dto.nodePath.trim().startsWith('/')) {
      throw new KBValidationError('Document nodePath must be an absolute path starting with "/"');
    }

    const payload = {
      title: dto.title.trim(),
      content: dto.content.trim(),
      nodePath: dto.nodePath.trim(),
      tags: dto.tags?.map(t => t.trim()).filter(t => t.length > 0) ?? []
    };

    const { data } = await this.post<{ document?: KBDocument }>('/add', payload);
    if (!data?.document) {
      throw new KBError('Knowledge Base API did not return created document payload');
    }
    return data.document;
  }
}
