import { Ticket, TicketFilter } from '../models/ticket.js';

export interface ITicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  findAll(filter?: TicketFilter): Promise<Ticket[]>;
  update(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  getNextId(): Promise<string>;
}
