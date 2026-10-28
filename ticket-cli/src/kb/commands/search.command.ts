import { Command } from 'commander';
import { IKBClient } from '../clients/kb-client.interface.js';
import { renderSearchResultsTable } from '../utils/kb-formatter.js';

export interface CommandContext {
  out: (msg: string) => void;
  err: (msg: string) => void;
  exit: (code: number) => void;
}

export function registerKbSearchCommand(
  cmd: Command,
  client: IKBClient,
  ctx: CommandContext
): void {
  cmd
    .command('search <query>')
    .description('Search Knowledge Base documents by title, tag, or content')
    .option('-k, --top-k <number>', 'Maximum number of results to return', '5')
    .action(async (query: string, options: { topK: string }) => {
      try {
        const topK = parseInt(options.topK, 10);
        if (isNaN(topK) || topK <= 0) {
          ctx.err('Error: --top-k must be a positive integer');
          ctx.exit(1);
          return;
        }

        const results = await client.search(query, { topK });
        ctx.out(renderSearchResultsTable(results, query));
      } catch (err: unknown) {
        ctx.err(`Error executing search: ${(err as Error).message}`);
        ctx.exit(1);
      }
    });
}
