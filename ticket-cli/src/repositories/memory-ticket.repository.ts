import { Ticket, TicketFilter } from '../models/ticket.js';
import { ITicketRepository } from './ticket-repository.interface.js';

export class MemoryTicketRepository implements ITicketRepository {
  private tickets: Map<string, Ticket> = new Map();

  constructor(initialTickets: Ticket[] = []) {
    for (const ticket of initialTickets) {
      this.tickets.set(ticket.id, { ...ticket });
    }
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const copy = { ...ticket, tags: [...ticket.tags] };
    this.tickets.set(ticket.id, copy);
    return { ...copy };
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;
    return { ...ticket, tags: [...ticket.tags] };
  }

  async findAll(filter?: TicketFilter): Promise<Ticket[]> {
    let result = Array.from(this.tickets.values()).map(t => ({
      ...t,
      tags: [...t.tags]
    }));

    if (filter) {
      if (filter.status) {
        result = result.filter(t => t.status === filter.status);
      }
      if (filter.priority) {
        result = result.filter(t => t.priority === filter.priority);
      }
      if (filter.tag) {
        const queryTag = filter.tag.toLowerCase();
        result = result.filter(t =>
          t.tags.some(tag => tag.toLowerCase() === queryTag)
        );
      }
    }

    return result;
  }

  async update(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    const existing = this.tickets.get(id);
    if (!existing) {
      throw new Error(`Ticket with ID ${id} not found in repository`);
    }

    const updated: Ticket = {
      ...existing,
      ...updates,
      id: existing.id, // prevent changing ID
      tags: updates.tags ? [...updates.tags] : [...existing.tags]
    };

    this.tickets.set(id, updated);
    return { ...updated };
  }

  async getNextId(): Promise<string> {
    let maxId = 0;
    const regex = /^TICK-(\d+)$/;
    for (const id of this.tickets.keys()) {
      const match = id.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return `TICK-${String(nextNum).padStart(3, '0')}`;
  }

  // Helper method for testing
  clear(): void {
    this.tickets.clear();
  }
}
