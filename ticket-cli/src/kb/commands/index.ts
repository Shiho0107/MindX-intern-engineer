import { Command } from 'commander';
import { IKBClient } from '../clients/kb-client.interface.js';
import { CommandContext, registerKbSearchCommand } from './search.command.js';
import { registerKbListCommand } from './list.command.js';
import { registerKbRetrieveCommand } from './retrieve.command.js';
import { registerKbAddCommand } from './add.command.js';

export { CommandContext } from './search.command.js';
export { registerKbSearchCommand } from './search.command.js';
export { registerKbListCommand } from './list.command.js';
export { registerKbRetrieveCommand } from './retrieve.command.js';
export { registerKbAddCommand } from './add.command.js';

export function registerKbCommands(
  parent: Command,
  client: IKBClient,
  ctx: CommandContext
): Command {
  const kb = parent
    .command('kb')
    .description('Manage and query Knowledge Base (search, list, retrieve, add)');

  registerKbSearchCommand(kb, client, ctx);
  registerKbListCommand(kb, client, ctx);
  registerKbRetrieveCommand(kb, client, ctx);
  registerKbAddCommand(kb, client, ctx);

  return kb;
}
