import { Command } from 'commander';
import { TicketService } from '../services/ticket.service.js';
import { colors, renderTable } from '../utils/formatter.js';
import { TicketStatus, TicketPriority } from '../models/ticket.js';
import { CommandContext } from './create.command.js';

export function registerListCommand(
  program: Command,
  service: TicketService,
  ctx: CommandContext
): void {
  program
    .command('list')
    .description('List tickets with optional multi-attribute filtering')
    .option(
      '-s, --status <status>',
      'Filter by status: open, in_progress, resolved, closed'
    )
    .option(
      '-p, --priority <priority>',
      'Filter by priority: low, medium, high, urgent'
    )
    .option('--tag <tag>', 'Filter by tag (case-insensitive)')
    .action(async options => {
      try {
        const filter: {
          status?: TicketStatus;
          priority?: TicketPriority;
          tag?: string;
        } = {};

        if (options.status) filter.status = options.status as TicketStatus;
        if (options.priority) filter.priority = options.priority as TicketPriority;
        if (options.tag) filter.tag = options.tag;

        const tickets = await service.listTickets(filter);

        if (tickets.length === 0) {
          ctx.out(colors.dim('No tickets found matching filters.'));
        } else {
          ctx.out(colors.bold(`Found ${tickets.length} ticket(s):`));
          ctx.out(renderTable(tickets));
        }
        ctx.exit(0);
      } catch (error) {
        ctx.err(colors.red(`Error: ${(error as Error).message}`));
        ctx.exit(1);
      }
    });
}
