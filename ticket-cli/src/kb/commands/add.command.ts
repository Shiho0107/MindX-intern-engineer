import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { IKBClient } from '../clients/kb-client.interface.js';
import { colors } from '../utils/kb-formatter.js';
import { CommandContext } from './search.command.js';

export function registerKbAddCommand(
  cmd: Command,
  client: IKBClient,
  ctx: CommandContext
): void {
  cmd
    .command('add')
    .description('Add a new document to the Knowledge Base from file or options')
    .option('-f, --file <path>', 'Path to markdown file containing document content')
    .option('-t, --title <title>', 'Title of the document')
    .option('-c, --content <content>', 'Inline markdown content (if not using --file)')
    .option('-p, --path <nodePath>', 'Node hierarchy path (e.g. /templates/sms or /docs/api)')
    .option('-n, --node <nodePath>', 'Alias for --path')
    .option('--tags <tags>', 'Comma-separated tags (e.g. "template,email,urgent")')
    .action(
      async (options: {
        file?: string;
        title?: string;
        content?: string;
        path?: string;
        node?: string;
        tags?: string;
      }) => {
        try {
          let content = options.content ?? '';
          let title = options.title ?? '';

          if (options.file) {
            const resolvedPath = path.resolve(process.cwd(), options.file);
            try {
              content = await fs.readFile(resolvedPath, 'utf-8');
            } catch (fileErr: unknown) {
              ctx.err(`Error reading file at "${options.file}": ${(fileErr as Error).message}`);
              ctx.exit(1);
              return;
            }

            if (!title) {
              const firstLine = content.split('\n').find(l => l.trim().length > 0) ?? '';
              const headerMatch = firstLine.match(/^#\s+(.+)$/);
              if (headerMatch) {
                title = headerMatch[1].trim();
              } else {
                title = path.basename(options.file, path.extname(options.file));
              }
            }
          }

          const nodePath = options.path || options.node;
          if (!nodePath) {
            ctx.err('Error: --path (or --node) is required (e.g. --path /templates/email)');
            ctx.exit(1);
            return;
          }

          if (!title) {
            ctx.err('Error: Document title is required (specify --title or --file)');
            ctx.exit(1);
            return;
          }

          if (!content) {
            ctx.err('Error: Document content is required (specify --content or --file)');
            ctx.exit(1);
            return;
          }

          const tags = options.tags
            ? options.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : [];

          const created = await client.add({
            title,
            content,
            nodePath,
            tags
          });

          ctx.out(
            [
              colors.green(colors.bold('✓ Document added to Knowledge Base successfully!')),
              `  ${colors.bold('ID:')}        ${colors.cyan(created.id)}`,
              `  ${colors.bold('Title:')}     ${created.title}`,
              `  ${colors.bold('Node Path:')} ${colors.blue(created.nodePath)}`,
              `  ${colors.bold('Tags:')}      ${created.tags.length > 0 ? created.tags.join(', ') : 'none'}`
            ].join('\n')
          );
        } catch (err: unknown) {
          ctx.err(`Error adding document: ${(err as Error).message}`);
          ctx.exit(1);
        }
      }
    );
}
