import { Command } from 'commander';
import { TicketService } from '../services/ticket.service.js';
import { colors, renderTicketCard } from '../utils/formatter.js';
import { TicketPriority } from '../models/ticket.js';

export interface CommandContext {
  out: (msg: string) => void;
  err: (msg: string) => void;
  exit: (code: number) => void;
}

export function registerCreateCommand(
  program: Command,
  service: TicketService,
  ctx: CommandContext
): void {
  program
    .command('create')
    .description('Create a new ticket and persist it to storage')
    .requiredOption('-t, --title <title>', 'Ticket title (1-100 characters)')
    .requiredOption('-d, --description <desc>', 'Ticket description')
    .option(
      '-p, --priority <priority>',
      'Ticket priority: low, medium, high, urgent',
      'medium'
    )
    .option(
      '--tags <tags>',
      'Comma-separated list of tags (e.g. bug,auth)'
    )
    .action(async options => {
      try {
        const rawTags = options.tags
          ? options.tags.split(',').map((t: string) => t.trim())
          : [];

        const ticket = await service.createTicket({
          title: options.title,
          description: options.description,
          priority: options.priority as TicketPriority,
          tags: rawTags
        });

        ctx.out(colors.green(`✔ Ticket created successfully! [${ticket.id}]`));
        ctx.out(renderTicketCard(ticket));
        ctx.exit(0);
      } catch (error) {
        ctx.err(colors.red(`Error: ${(error as Error).message}`));
        ctx.exit(1);
      }
    });
}
