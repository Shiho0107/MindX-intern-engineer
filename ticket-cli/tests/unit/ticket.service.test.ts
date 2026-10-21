import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTicketRepository } from '../../src/repositories/memory-ticket.repository.js';
import { TicketService } from '../../src/services/ticket.service.js';
import { ValidationError, TicketNotFoundError } from '../../src/errors/ticket-errors.js';

describe('TicketService Unit Tests', () => {
  let repository: MemoryTicketRepository;
  let service: TicketService;

  beforeEach(() => {
    repository = new MemoryTicketRepository();
    service = new TicketService(repository);
  });

  describe('TDD Cycle 1: Ticket Creation & Default Values', () => {
    it('creates a ticket with valid inputs and default values', async () => {
      const ticket = await service.createTicket({
        title: 'Fix auth session bug',
        description: 'Session token expires immediately'
      });

      expect(ticket.id).toBe('TICK-001');
      expect(ticket.title).toBe('Fix auth session bug');
      expect(ticket.description).toBe('Session token expires immediately');
      expect(ticket.status).toBe('open');
      expect(ticket.priority).toBe('medium');
      expect(ticket.tags).toEqual([]);
      expect(new Date(ticket.createdAt).toISOString()).toBe(ticket.createdAt);
      expect(new Date(ticket.updatedAt).toISOString()).toBe(ticket.updatedAt);
      expect(ticket.createdAt).toBe(ticket.updatedAt);
    });

    it('creates a ticket with custom priority and tags', async () => {
      const ticket = await service.createTicket({
        title: 'Database connection issue',
        description: 'Connection pool exhausted under load',
        priority: 'urgent',
        tags: ['database', 'backend']
      });

      expect(ticket.id).toBe('TICK-001');
      expect(ticket.priority).toBe('urgent');
      expect(ticket.tags).toEqual(['database', 'backend']);
    });

    it('generates sequential IDs for multiple tickets', async () => {
      const ticket1 = await service.createTicket({
        title: 'Ticket 1',
        description: 'Desc 1'
      });
      const ticket2 = await service.createTicket({
        title: 'Ticket 2',
        description: 'Desc 2'
      });

      expect(ticket1.id).toBe('TICK-001');
      expect(ticket2.id).toBe('TICK-002');
    });
  });

  describe('TDD Cycle 2: Input Validation Rules', () => {
    it('throws ValidationError when title is missing or empty', async () => {
      await expect(
        service.createTicket({ title: '', description: 'Some description' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createTicket({ title: '   ', description: 'Some description' })
      ).rejects.toThrow('Title cannot be empty');
    });

    it('throws ValidationError when title exceeds 100 characters', async () => {
      const longTitle = 'a'.repeat(101);
      await expect(
        service.createTicket({ title: longTitle, description: 'Some description' })
      ).rejects.toThrow('Title cannot exceed 100 characters');
    });

    it('throws ValidationError when description is missing or empty', async () => {
      await expect(
        service.createTicket({ title: 'Valid Title', description: '' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createTicket({ title: 'Valid Title', description: '   ' })
      ).rejects.toThrow('Description cannot be empty');
    });

    it('throws ValidationError when priority is invalid', async () => {
      await expect(
        service.createTicket({
          title: 'Valid Title',
          description: 'Valid Desc',
          // @ts-expect-error Testing runtime invalid priority
          priority: 'critical'
        })
      ).rejects.toThrow(/Invalid priority/);
    });

    it('normalizes tags by trimming whitespace and removing empty items', async () => {
      const ticket = await service.createTicket({
        title: 'Tag Test',
        description: 'Testing tag normalization',
        tags: ['  bug ', '', '  ', 'auth  ']
      });

      expect(ticket.tags).toEqual(['bug', 'auth']);
    });
  });

  describe('TDD Cycle 3: Query & Filtering Logic', () => {
    beforeEach(async () => {
      await service.createTicket({
        title: 'Bug in login',
        description: '500 error on submit',
        priority: 'high',
        tags: ['auth', 'bug']
      });
      await service.createTicket({
        title: 'Database indexing',
        description: 'Add index on email column',
        priority: 'medium',
        tags: ['database', 'performance']
      });
      await service.createTicket({
        title: 'UI styling glitch',
        description: 'Button misaligned in Safari',
        priority: 'low',
        tags: ['ui', 'bug']
      });
    });

    it('returns ticket by ID if found', async () => {
      const ticket = await service.getTicketById('TICK-001');
      expect(ticket.id).toBe('TICK-001');
      expect(ticket.title).toBe('Bug in login');
    });

    it('throws TicketNotFoundError if ticket does not exist', async () => {
      await expect(service.getTicketById('TICK-999')).rejects.toThrow(
        TicketNotFoundError
      );
    });

    it('lists all tickets when no filters provided', async () => {
      const tickets = await service.listTickets();
      expect(tickets.length).toBe(3);
    });

    it('filters tickets by status', async () => {
      await service.updateTicket('TICK-001', { status: 'in_progress' });

      const openTickets = await service.listTickets({ status: 'open' });
      expect(openTickets.length).toBe(2);

      const inProgressTickets = await service.listTickets({ status: 'in_progress' });
      expect(inProgressTickets.length).toBe(1);
      expect(inProgressTickets[0].id).toBe('TICK-001');
    });

    it('filters tickets by priority', async () => {
      const highTickets = await service.listTickets({ priority: 'high' });
      expect(highTickets.length).toBe(1);
      expect(highTickets[0].title).toBe('Bug in login');
    });

    it('filters tickets by tag (case-insensitive)', async () => {
      const bugTickets = await service.listTickets({ tag: 'BUG' });
      expect(bugTickets.length).toBe(2);
      expect(bugTickets.map(t => t.id)).toEqual(['TICK-001', 'TICK-003']);
    });

    it('filters tickets by combined criteria', async () => {
      const filtered = await service.listTickets({
        priority: 'high',
        tag: 'auth'
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('TICK-001');
    });

    it('returns empty array when no tickets match filters', async () => {
      const nonExistent = await service.listTickets({ tag: 'non-existent' });
      expect(nonExistent).toEqual([]);
    });
  });

  describe('TDD Cycle 4: Ticket Updates & Status Transitions', () => {
    let createdTicketId: string;
    let initialCreatedAt: string;

    beforeEach(async () => {
      const ticket = await service.createTicket({
        title: 'Original Title',
        description: 'Original Description',
        priority: 'medium',
        tags: ['original']
      });
      createdTicketId = ticket.id;
      initialCreatedAt = ticket.createdAt;
    });

    it('updates ticket status and updates the updatedAt timestamp', async () => {
      // Small pause to guarantee timestamp difference if necessary
      const updated = await service.updateTicket(createdTicketId, {
        status: 'in_progress'
      });

      expect(updated.status).toBe('in_progress');
      expect(updated.createdAt).toBe(initialCreatedAt);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initialCreatedAt).getTime()
      );
    });

    it('updates title, description, priority, and tags', async () => {
      const updated = await service.updateTicket(createdTicketId, {
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'urgent',
        tags: ['urgent', 'bug']
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated Description');
      expect(updated.priority).toBe('urgent');
      expect(updated.tags).toEqual(['urgent', 'bug']);
    });

    it('throws ValidationError if no update fields are provided', async () => {
      await expect(service.updateTicket(createdTicketId, {})).rejects.toThrow(
        'At least one field must be provided for update'
      );
    });

    it('throws TicketNotFoundError when updating non-existent ticket', async () => {
      await expect(
        service.updateTicket('TICK-999', { status: 'closed' })
      ).rejects.toThrow(TicketNotFoundError);
    });

    it('throws ValidationError when updating with invalid status', async () => {
      await expect(
        service.updateTicket(createdTicketId, {
          // @ts-expect-error Testing runtime invalid status
          status: 'invalid_status'
        })
      ).rejects.toThrow(/Invalid status/);
    });

    it('throws ValidationError when updating with invalid priority', async () => {
      await expect(
        service.updateTicket(createdTicketId, {
          // @ts-expect-error Testing runtime invalid priority
          priority: 'critical'
        })
      ).rejects.toThrow(/Invalid priority/);
    });

    it('throws ValidationError when updating with empty title', async () => {
      await expect(
        service.updateTicket(createdTicketId, { title: '   ' })
      ).rejects.toThrow('Title cannot be empty');
    });

    it('throws ValidationError when updating with title over 100 characters', async () => {
      await expect(
        service.updateTicket(createdTicketId, { title: 'x'.repeat(101) })
      ).rejects.toThrow('Title cannot exceed 100 characters');
    });
  });
});
