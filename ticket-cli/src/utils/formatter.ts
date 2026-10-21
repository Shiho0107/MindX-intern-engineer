import { Ticket, TicketStatus, TicketPriority } from '../models/ticket.js';

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
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bgGreen: (text: string) => `\x1b[42m\x1b[30m${text}\x1b[0m`,
  bgBlue: (text: string) => `\x1b[44m\x1b[37m${text}\x1b[0m`
};

export function formatStatus(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return colors.yellow('open');
    case 'in_progress':
      return colors.blue('in_progress');
    case 'resolved':
      return colors.green('resolved');
    case 'closed':
      return colors.gray('closed');
    default:
      return status;
  }
}

export function formatPriority(priority: TicketPriority): string {
  switch (priority) {
    case 'urgent':
      return colors.red('urgent');
    case 'high':
      return colors.magenta('high');
    case 'medium':
      return colors.cyan('medium');
    case 'low':
      return colors.gray('low');
    default:
      return priority;
  }
}

export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) return colors.dim('none');
  return tags.map(t => colors.cyan(`[${t}]`)).join(' ');
}

// Strip ANSI codes for width calculation
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[\d+m/g, '');
}

export function renderTable(tickets: Ticket[]): string {
  if (tickets.length === 0) {
    return colors.dim('No tickets found matching filters.');
  }

  const headers = ['ID', 'TITLE', 'STATUS', 'PRIORITY', 'TAGS', 'UPDATED AT'];

  const rows = tickets.map(t => [
    t.id,
    t.title.length > 30 ? t.title.slice(0, 27) + '...' : t.title,
    t.status,
    t.priority,
    t.tags.length > 0 ? t.tags.join(', ') : '-',
    new Date(t.updatedAt).toLocaleString()
  ]);

  // Compute column widths
  const colWidths = headers.map((h, i) => {
    const maxRowLen = rows.reduce(
      (max, row) => Math.max(max, stripAnsi(row[i]).length),
      0
    );
    return Math.max(h.length, maxRowLen);
  });

  const pad = (str: string, width: number) => {
    const visibleLen = stripAnsi(str).length;
    return str + ' '.repeat(Math.max(0, width - visibleLen));
  };

  const headerLine = headers
    .map((h, i) => colors.bold(pad(h, colWidths[i])))
    .join('  ');

  const separator = colWidths.map(w => '─'.repeat(w)).join('  ');

  const rowLines = tickets.map((t, rowIdx) => {
    const idStr = colors.cyan(pad(rows[rowIdx][0], colWidths[0]));
    const titleStr = pad(rows[rowIdx][1], colWidths[1]);
    const statusStr = pad(formatStatus(t.status), colWidths[2]);
    const priorityStr = pad(formatPriority(t.priority), colWidths[3]);
    const tagsStr = pad(rows[rowIdx][4], colWidths[4]);
    const updatedStr = colors.dim(pad(rows[rowIdx][5], colWidths[5]));

    return `${idStr}  ${titleStr}  ${statusStr}  ${priorityStr}  ${tagsStr}  ${updatedStr}`;
  });

  return [headerLine, separator, ...rowLines].join('\n');
}

export function renderTicketCard(ticket: Ticket): string {
  const line = '─'.repeat(50);
  return [
    colors.cyan(`Ticket ${ticket.id}`),
    line,
    `${colors.bold('Title:')}       ${ticket.title}`,
    `${colors.bold('Status:')}      ${formatStatus(ticket.status)}`,
    `${colors.bold('Priority:')}    ${formatPriority(ticket.priority)}`,
    `${colors.bold('Tags:')}        ${formatTags(ticket.tags)}`,
    `${colors.bold('Created At:')}  ${ticket.createdAt}`,
    `${colors.bold('Updated At:')}  ${ticket.updatedAt}`,
    line,
    colors.bold('Description:'),
    ticket.description,
    line
  ].join('\n');
}
