import { IKBClient } from './kb-client.interface.js';
import {
  KBDocument,
  KBSearchResult,
  AddDocumentDTO,
  SearchOptions,
  ListOptions
} from '../models/kb-document.js';

export interface HTTPKBClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class HTTPKBClient implements IKBClient {
  constructor(private readonly options: HTTPKBClientOptions) {}

  async search(_query: string, _options?: SearchOptions): Promise<KBSearchResult[]> {
    throw new Error('Not implemented');
  }

  async list(_options?: ListOptions): Promise<KBDocument[]> {
    throw new Error('Not implemented');
  }

  async retrieve(_docId: string): Promise<KBDocument | null> {
    throw new Error('Not implemented');
  }

  async add(_dto: AddDocumentDTO): Promise<KBDocument> {
    throw new Error('Not implemented');
  }
}
