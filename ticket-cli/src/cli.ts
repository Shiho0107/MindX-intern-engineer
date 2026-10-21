import { Command } from 'commander';
import * as path from 'node:path';
import { TicketService } from './services/ticket.service.js';
import { JsonFileTicketRepository } from './repositories/json-file-ticket.repository.js';
import { ITicketRepository } from './repositories/ticket-repository.interface.js';
import { CommandContext, registerCreateCommand } from './commands/create.command.js';
import { registerListCommand } from './commands/list.command.js';
import { registerShowCommand } from './commands/show.command.js';
import { registerUpdateCommand } from './commands/update.command.js';

export interface CliOptions {
  storagePath?: string;
  repository?: ITicketRepository;
  service?: TicketService;
  out?: (msg: string) => void;
  err?: (msg: string) => void;
  exit?: (code: number) => void;
}

export function createCli(options: CliOptions = {}): {
  program: Command;
  run: (argv?: string[]) => Promise<void>;
} {
  const out = options.out ?? ((msg: string) => console.log(msg));
  const err = options.err ?? ((msg: string) => console.error(msg));
  const exit = options.exit ?? ((code: number) => process.exit(code));

  const ctx: CommandContext = { out, err, exit };

  const storagePath =
    options.storagePath ?? path.resolve(process.cwd(), 'tickets.json');

  const repository =
    options.repository ??
    (options.service ? undefined : new JsonFileTicketRepository(storagePath));

  const service =
    options.service ?? new TicketService(repository as ITicketRepository);

  const program = new Command();
  program
    .name('tickets')
    .description('MindX Ticket Manager CLI - Manage tasks & tickets locally')
    .version('1.0.0')
    .exitOverride((commandError) => {
      // Commander throws CommanderError on --help (exitCode 0) or errors (exitCode != 0)
      if (
        commandError.exitCode === 0 ||
        commandError.code === 'commander.helpDisplayed' ||
        commandError.code === 'commander.version'
      ) {
        exit(0);
      } else {
        err(commandError.message);
        exit(1);
      }
    });

  registerCreateCommand(program, service, ctx);
  registerListCommand(program, service, ctx);
  registerShowCommand(program, service, ctx);
  registerUpdateCommand(program, service, ctx);

  const run = async (argv: string[] = process.argv): Promise<void> => {
    try {
      await program.parseAsync(argv);
    } catch {
      // Handled by exitOverride and command action handlers
    }
  };

  return { program, run };
}
