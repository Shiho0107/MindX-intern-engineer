import { Command } from 'commander';
import { IKBClient } from '../clients/kb-client.interface.js';
import { renderDocumentDetail } from '../utils/kb-formatter.js';
import { CommandContext } from './search.command.js';

export function registerKbRetrieveCommand(
  cmd: Command,
  client: IKBClient,
  ctx: CommandContext
): void {
  cmd
    .command('retrieve <id>')
    .description('Display complete details and content of a Knowledge Base document')
    .action(async (id: string) => {
      try {
        const doc = await client.retrieve(id);
        if (!doc) {
          ctx.err(`Error: Document with ID "${id}" was not found in Knowledge Base`);
          ctx.exit(1);
          return;
        }

        ctx.out(renderDocumentDetail(doc));
      } catch (err: unknown) {
        ctx.err(`Error retrieving document: ${(err as Error).message}`);
        ctx.exit(1);
      }
    });
}
