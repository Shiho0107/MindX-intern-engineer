import {
  Ticket,
  TicketStatus,
  TicketPriority,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketFilter
} from '../models/ticket.js';
import { ITicketRepository } from '../repositories/ticket-repository.interface.js';
import { ValidationError, TicketNotFoundError } from '../errors/ticket-errors.js';

export const VALID_STATUSES: readonly TicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed'
] as const;

export const VALID_PRIORITIES: readonly TicketPriority[] = [
  'low',
  'medium',
  'high',
  'urgent'
] as const;

export class TicketService {
  constructor(private readonly repository: ITicketRepository) {}

  async createTicket(dto: CreateTicketDTO): Promise<Ticket> {
    this.validateTitle(dto.title);
    this.validateDescription(dto.description);

    const priority: TicketPriority = dto.priority ?? 'medium';
    this.validatePriority(priority);

    const tags = this.normalizeTags(dto.tags);

    const id = await this.repository.getNextId();
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id,
      title: dto.title.trim(),
      description: dto.description.trim(),
      status: 'open',
      priority,
      tags,
      createdAt: now,
      updatedAt: now
    };

    return this.repository.create(newTicket);
  }

  async getTicketById(id: string): Promise<Ticket> {
    if (!id || !id.trim()) {
      throw new ValidationError('Ticket ID is required');
    }

    const ticket = await this.repository.findById(id.trim());
    if (!ticket) {
      throw new TicketNotFoundError(id.trim());
    }

    return ticket;
  }

  async listTickets(filter?: TicketFilter): Promise<Ticket[]> {
    if (filter?.status && !VALID_STATUSES.includes(filter.status)) {
      throw new ValidationError(
        `Invalid status filter "${filter.status}". Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    }

    if (filter?.priority && !VALID_PRIORITIES.includes(filter.priority)) {
      throw new ValidationError(
        `Invalid priority filter "${filter.priority}". Allowed values: ${VALID_PRIORITIES.join(', ')}`
      );
    }

    return this.repository.findAll(filter);
  }

  async updateTicket(id: string, dto: UpdateTicketDTO): Promise<Ticket> {
    if (!id || !id.trim()) {
      throw new ValidationError('Ticket ID is required');
    }

    const cleanId = id.trim();
    // Verify existence
    const existing = await this.repository.findById(cleanId);
    if (!existing) {
      throw new TicketNotFoundError(cleanId);
    }

    const hasAnyField =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.status !== undefined ||
      dto.priority !== undefined ||
      dto.tags !== undefined;

    if (!hasAnyField) {
      throw new ValidationError('At least one field must be provided for update');
    }

    const updates: Partial<Ticket> = {};

    if (dto.title !== undefined) {
      this.validateTitle(dto.title);
      updates.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      this.validateDescription(dto.description);
      updates.description = dto.description.trim();
    }

    if (dto.status !== undefined) {
      this.validateStatus(dto.status);
      updates.status = dto.status;
    }

    if (dto.priority !== undefined) {
      this.validatePriority(dto.priority);
      updates.priority = dto.priority;
    }

    if (dto.tags !== undefined) {
      updates.tags = this.normalizeTags(dto.tags);
    }

    updates.updatedAt = new Date().toISOString();

    return this.repository.update(cleanId, updates);
  }

  private validateTitle(title: unknown): void {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Title cannot be empty');
    }
    if (title.trim().length > 100) {
      throw new ValidationError('Title cannot exceed 100 characters');
    }
  }

  private validateDescription(description: unknown): void {
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new ValidationError('Description cannot be empty');
    }
  }

  private validatePriority(priority: unknown): void {
    if (!VALID_PRIORITIES.includes(priority as TicketPriority)) {
      throw new ValidationError(
        `Invalid priority "${priority}". Allowed options: ${VALID_PRIORITIES.join(', ')}`
      );
    }
  }

  private validateStatus(status: unknown): void {
    if (!VALID_STATUSES.includes(status as TicketStatus)) {
      throw new ValidationError(
        `Invalid status "${status}". Allowed options: ${VALID_STATUSES.join(', ')}`
      );
    }
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || !Array.isArray(tags)) {
      return [];
    }

    return tags
      .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(tag => tag.length > 0);
  }
}
