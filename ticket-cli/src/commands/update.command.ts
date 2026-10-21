import { Command } from 'commander';
import { TicketService } from '../services/ticket.service.js';
import { colors, renderTicketCard } from '../utils/formatter.js';
import { TicketStatus, TicketPriority, UpdateTicketDTO } from '../models/ticket.js';
import { CommandContext } from './create.command.js';

export function registerUpdateCommand(
  program: Command,
  service: TicketService,
  ctx: CommandContext
): void {
  program
    .command('update <id>')
    .description('Update status, priority, or content of an existing ticket')
    .option(
      '-s, --status <status>',
      'New status: open, in_progress, resolved, closed'
    )
    .option(
      '-p, --priority <priority>',
      'New priority: low, medium, high, urgent'
    )
    .option('-t, --title <title>', 'New title (1-100 characters)')
    .option('-d, --description <desc>', 'New description')
    .option('--tags <tags>', 'New comma-separated list of tags')
    .action(async (id: string, options) => {
      try {
        const dto: UpdateTicketDTO = {};

        if (options.status !== undefined) dto.status = options.status as TicketStatus;
        if (options.priority !== undefined) dto.priority = options.priority as TicketPriority;
        if (options.title !== undefined) dto.title = options.title;
        if (options.description !== undefined) dto.description = options.description;
        if (options.tags !== undefined) {
          dto.tags = options.tags.split(',').map((t: string) => t.trim());
        }

        const updated = await service.updateTicket(id, dto);

        ctx.out(colors.green(`✔ Ticket ${updated.id} updated successfully!`));
        ctx.out(renderTicketCard(updated));
        ctx.exit(0);
      } catch (error) {
        ctx.err(colors.red(`Error: ${(error as Error).message}`));
        ctx.exit(1);
      }
    });
}
