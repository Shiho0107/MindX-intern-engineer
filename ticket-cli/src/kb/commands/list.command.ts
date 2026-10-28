import { Command } from 'commander';
import { IKBClient } from '../clients/kb-client.interface.js';
import { renderDocumentTable } from '../utils/kb-formatter.js';
import { CommandContext } from './search.command.js';

export function registerKbListCommand(
  cmd: Command,
  client: IKBClient,
  ctx: CommandContext
): void {
  cmd
    .command('list')
    .description('List Knowledge Base documents with optional nodePath filtering')
    .option('-n, --node <path>', 'Filter documents by nodePath hierarchy (e.g., /templates)')
    .option('-l, --limit <number>', 'Maximum number of documents to display', '10')
    .action(async (options: { node?: string; limit: string }) => {
      try {
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit <= 0) {
          ctx.err('Error: --limit must be a positive integer');
          ctx.exit(1);
          return;
        }

        const docs = await client.list({
          nodePath: options.node,
          limit
        });

        ctx.out(renderDocumentTable(docs));
      } catch (err: unknown) {
        ctx.err(`Error listing documents: ${(err as Error).message}`);
        ctx.exit(1);
      }
    });
}
