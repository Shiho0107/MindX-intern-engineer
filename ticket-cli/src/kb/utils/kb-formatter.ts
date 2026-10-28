import { KBDocument, KBSearchResult } from '../models/kb-document.js';

export const colors = {
  reset: (text: string) => `\x1b[0m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`
};

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[\d+m/g, '');
}

function pad(str: string, len: number): string {
  const visibleLen = stripAnsi(str).length;
  if (visibleLen >= len) return str;
  return str + ' '.repeat(len - visibleLen);
}

export function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return colors.dim('none');
  return tags.map(t => colors.cyan(`[${t}]`)).join(' ');
}

export function renderDocumentTable(docs: KBDocument[]): string {
  if (docs.length === 0) {
    return colors.dim('No documents found matching criteria.');
  }

  const idWidth = 10;
  const pathWidth = 22;
  const titleWidth = 36;
  const tagsWidth = 24;

  const header = `${pad(colors.bold('ID'), idWidth)}  ${pad(colors.bold('NODE PATH'), pathWidth)}  ${pad(colors.bold('TITLE'), titleWidth)}  ${colors.bold('TAGS')}`;
  const separator = `${colors.dim('─'.repeat(idWidth))}  ${colors.dim('─'.repeat(pathWidth))}  ${colors.dim('─'.repeat(titleWidth))}  ${colors.dim('─'.repeat(tagsWidth))}`;

  const rows = docs.map(d => {
    const titleSnippet = d.title.length > 34 ? `${d.title.slice(0, 31)}...` : d.title;
    const pathSnippet = d.nodePath.length > 20 ? `${d.nodePath.slice(0, 18)}...` : d.nodePath;
    return `${pad(colors.bold(colors.cyan(d.id)), idWidth)}  ${pad(colors.blue(pathSnippet), pathWidth)}  ${pad(titleSnippet, titleWidth)}  ${formatTags(d.tags)}`;
  });

  return [header, separator, ...rows, '', colors.dim(`Total documents: ${docs.length}`)].join('\n');
}

export function renderSearchResultsTable(results: KBSearchResult[], query: string): string {
  if (results.length === 0) {
    return colors.dim(`No documents found matching query "${query}".`);
  }

  const idWidth = 10;
  const matchWidth = 12;
  const pathWidth = 22;
  const titleWidth = 34;

  const header = `${pad(colors.bold('ID'), idWidth)}  ${pad(colors.bold('MATCH'), matchWidth)}  ${pad(colors.bold('NODE PATH'), pathWidth)}  ${pad(colors.bold('TITLE'), titleWidth)}`;
  const separator = `${colors.dim('─'.repeat(idWidth))}  ${colors.dim('─'.repeat(matchWidth))}  ${colors.dim('─'.repeat(pathWidth))}  ${colors.dim('─'.repeat(titleWidth))}`;

  const rows = results.map(r => {
    const matchLabel = r.matchType === 'title'
      ? colors.green('title')
      : r.matchType === 'tag'
      ? colors.magenta('tag')
      : colors.yellow('content');

    const pathSnippet = r.nodePath.length > 20 ? `${r.nodePath.slice(0, 18)}...` : r.nodePath;
    const titleSnippet = r.title.length > 32 ? `${r.title.slice(0, 29)}...` : r.title;

    let line = `${pad(colors.bold(colors.cyan(r.id)), idWidth)}  ${pad(matchLabel, matchWidth)}  ${pad(colors.blue(pathSnippet), pathWidth)}  ${pad(titleSnippet, titleWidth)}`;
    if (r.snippet) {
      line += `\n    ${colors.dim('Snippet:')} ${colors.dim(r.snippet)}`;
    }
    return line;
  });

  return [
    colors.bold(`Search Results for "${query}":`),
    header,
    separator,
    ...rows,
    '',
    colors.dim(`Total matches found: ${results.length}`)
  ].join('\n');
}

export function renderDocumentDetail(doc: KBDocument): string {
  const divider = colors.dim('─'.repeat(60));
  return [
    divider,
    `${colors.bold('Document ID:')}  ${colors.cyan(doc.id)}`,
    `${colors.bold('Title:')}        ${doc.title}`,
    `${colors.bold('Node Path:')}    ${colors.blue(doc.nodePath)}`,
    `${colors.bold('Tags:')}         ${formatTags(doc.tags)}`,
    doc.createdAt ? `${colors.bold('Created:')}      ${colors.dim(doc.createdAt)}` : '',
    doc.updatedAt ? `${colors.bold('Updated:')}      ${colors.dim(doc.updatedAt)}` : '',
    divider,
    colors.bold('Content:'),
    '',
    doc.content,
    divider
  ].filter(line => line !== '').join('\n');
}
