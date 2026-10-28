import { IKBClient } from './kb-client.interface.js';
import {
  KBDocument,
  KBSearchResult,
  AddDocumentDTO,
  SearchOptions,
  ListOptions
} from '../models/kb-document.js';
import { KBValidationError } from '../errors/kb-errors.js';

export class MockKBClient implements IKBClient {
  private documents: KBDocument[] = [];

  constructor(initialDocs?: KBDocument[]) {
    if (initialDocs) {
      this.documents = initialDocs.map(d => ({ ...d, tags: [...d.tags] }));
    } else {
      this.seedDefaultDocuments();
    }
  }

  private seedDefaultDocuments(): void {
    this.documents = [
      {
        id: 'doc-001',
        title: 'Customer Response Template',
        content: `# Customer Response Template

Dear {{customer_name}},

Thank you for reaching out to MindX support regarding your inquiry. Our engineering team is currently reviewing your ticket and will provide an update within 24 business hours.

Best regards,
Customer Support Team`,
        nodePath: '/templates/email',
        tags: ['template', 'email', 'support'],
        createdAt: '2026-10-20T08:00:00.000Z',
        updatedAt: '2026-10-20T08:00:00.000Z'
      },
      {
        id: 'doc-002',
        title: 'DevOps On-Call Schedule & Contacts',
        content: `# DevOps On-Call Schedule

Weekly shift rotation for infrastructure operations and incident response:
- Primary Engineer: Alex Nguyen (alex@mindx.edu.vn)
- Secondary Engineer: Chi Le (chi@mindx.edu.vn)
- Escalation hotline: +84 900 123 456

For critical outage escalation, follow standard runbook at /docs/guides/incident-response.md.`,
        nodePath: '/team/devops',
        tags: ['team', 'devops', 'schedule'],
        createdAt: '2026-10-21T09:30:00.000Z',
        updatedAt: '2026-10-21T09:30:00.000Z'
      },
      {
        id: 'doc-003',
        title: 'API Integration Best Practices',
        content: `# API Integration Guide

Guidelines for secure and robust service integration:
1. Always pass Bearer token in authorization header for authenticated routes.
2. Implement exponential backoff retry for transient network errors (HTTP 502, 503).
3. Validate JSON payload schemas before dispatch to minimize client errors.`,
        nodePath: '/docs/guides',
        tags: ['docs', 'guide', 'api'],
        createdAt: '2026-10-22T10:15:00.000Z',
        updatedAt: '2026-10-22T10:15:00.000Z'
      }
    ];
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map(t => t.trim()).filter(t => t.length > 0);
  }

  private generateSnippet(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return content.slice(0, 120).trim() + (content.length > 120 ? '...' : '');
    }

    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(content.length, matchIndex + query.length + 60);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < content.length ? '...' : '';
    return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
  }

  async list(options?: ListOptions): Promise<KBDocument[]> {
    const limit = options?.limit ?? 10;
    let result = this.documents;

    if (options?.nodePath) {
      const targetPath = options.nodePath.replace(/\/+$/, '');
      result = result.filter(d => {
        const docPath = d.nodePath.replace(/\/+$/, '');
        return docPath === targetPath || docPath.startsWith(targetPath + '/');
      });
    }

    return result.slice(0, limit).map(d => ({ ...d, tags: [...d.tags] }));
  }

  async search(query: string, options?: SearchOptions): Promise<KBSearchResult[]> {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    const topK = options?.topK ?? 5;
    const matches: KBSearchResult[] = [];

    for (const doc of this.documents) {
      const lowerTitle = doc.title.toLowerCase();
      const lowerTags = doc.tags.map(t => t.toLowerCase());
      const lowerContent = doc.content.toLowerCase();

      let matchType: 'title' | 'tag' | 'content' | null = null;
      let score = 0;

      if (lowerTitle.includes(trimmedQuery)) {
        matchType = 'title';
        score = 100;
      } else if (lowerTags.some(t => t.includes(trimmedQuery))) {
        matchType = 'tag';
        score = 80;
      } else if (lowerContent.includes(trimmedQuery)) {
        matchType = 'content';
        score = 50;
      }

      if (matchType) {
        matches.push({
          id: doc.id,
          title: doc.title,
          nodePath: doc.nodePath,
          tags: [...doc.tags],
          matchType,
          score,
          snippet: this.generateSnippet(doc.content, query.trim())
        });
      }
    }

    // Sort by relevance score descending
    matches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return matches.slice(0, topK);
  }

  async retrieve(docId: string): Promise<KBDocument | null> {
    const found = this.documents.find(d => d.id === docId);
    if (!found) return null;
    return { ...found, tags: [...found.tags] };
  }

  async add(dto: AddDocumentDTO): Promise<KBDocument> {
    const trimmedTitle = dto.title?.trim();
    if (!trimmedTitle) {
      throw new KBValidationError('Document title is required and cannot be empty');
    }

    const trimmedContent = dto.content?.trim();
    if (!trimmedContent) {
      throw new KBValidationError('Document content is required and cannot be empty');
    }

    const trimmedPath = dto.nodePath?.trim();
    if (!trimmedPath || !trimmedPath.startsWith('/')) {
      throw new KBValidationError('Document nodePath must be a valid absolute path starting with "/"');
    }

    // Generate sequential ID
    let maxId = 0;
    const regex = /^doc-(\d+)$/;
    for (const doc of this.documents) {
      const match = doc.id.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }

    const nextId = `doc-${String(maxId + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newDoc: KBDocument = {
      id: nextId,
      title: trimmedTitle,
      content: trimmedContent,
      nodePath: trimmedPath,
      tags: this.normalizeTags(dto.tags),
      createdAt: now,
      updatedAt: now
    };

    this.documents.push(newDoc);
    return { ...newDoc, tags: [...newDoc.tags] };
  }
}
