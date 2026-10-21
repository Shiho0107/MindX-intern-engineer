import { Command } from 'commander';
import { TicketService } from '../services/ticket.service.js';
import { colors, renderTicketCard } from '../utils/formatter.js';
import { CommandContext } from './create.command.js';

export function registerShowCommand(
  program: Command,
  service: TicketService,
  ctx: CommandContext
): void {
  program
    .command('show <id>')
    .description('Display complete ticket details')
    .action(async (id: string) => {
      try {
        const ticket = await service.getTicketById(id);
        ctx.out(renderTicketCard(ticket));
        ctx.exit(0);
      } catch (error) {
        ctx.err(colors.red(`Error: ${(error as Error).message}`));
        ctx.exit(1);
      }
    });
}
