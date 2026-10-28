import {
  KBDocument,
  KBSearchResult,
  AddDocumentDTO,
  SearchOptions,
  ListOptions
} from '../models/kb-document.js';

export interface IKBClient {
  search(query: string, options?: SearchOptions): Promise<KBSearchResult[]>;
  list(options?: ListOptions): Promise<KBDocument[]>;
  retrieve(docId: string): Promise<KBDocument | null>;
  add(dto: AddDocumentDTO): Promise<KBDocument>;
}
