export interface KBDocument {
  id: string;
  title: string;
  content: string;
  nodePath: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KBSearchResult {
  id: string;
  title: string;
  nodePath: string;
  tags?: string[];
  snippet?: string;
  matchType?: 'title' | 'tag' | 'content';
  score?: number;
}

export interface AddDocumentDTO {
  title: string;
  content: string;
  nodePath: string;
  tags?: string[];
}

export interface SearchOptions {
  topK?: number;
}

export interface ListOptions {
  nodePath?: string;
  limit?: number;
}
