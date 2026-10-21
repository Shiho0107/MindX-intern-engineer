import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Ticket, TicketFilter, StorageData } from '../models/ticket.js';
import { ITicketRepository } from './ticket-repository.interface.js';
import { StorageError } from '../errors/ticket-errors.js';

export class JsonFileTicketRepository implements ITicketRepository {
  constructor(private readonly filePath: string) {}

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readData(): Promise<StorageData> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      try {
        const parsed = JSON.parse(content) as StorageData;
        if (!parsed || !Array.isArray(parsed.tickets)) {
          throw new Error('Storage file structure is invalid: "tickets" array missing');
        }
        return parsed;
      } catch (parseError) {
        throw new StorageError(
          `Failed to parse storage file at "${this.filePath}": ${(parseError as Error).message}`,
          parseError
        );
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        const initialData: StorageData = {
          version: 1,
          updatedAt: new Date().toISOString(),
          tickets: []
        };
        await this.writeData(initialData);
        return initialData;
      }
      if (err instanceof StorageError) {
        throw err;
      }
      throw new StorageError(
        `Failed to read storage file at "${this.filePath}": ${(err as Error).message}`,
        err
      );
    }
  }

  private async writeData(data: StorageData): Promise<void> {
    await this.ensureDirectory();
    data.updatedAt = new Date().toISOString();
    const content = JSON.stringify(data, null, 2);

    // Atomic write pattern: write to unique temp file then rename
    const tempFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

    try {
      await fs.writeFile(tempFile, content, 'utf-8');
      try {
        await fs.rename(tempFile, this.filePath);
      } catch {
        // Fallback for Windows lock issues: copyFile then unlink
        await fs.copyFile(tempFile, this.filePath);
        await fs.unlink(tempFile);
      }
    } catch (writeErr) {
      // Clean up temp file if still around
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore unlink error
      }
      throw new StorageError(
        `Failed to write to storage file at "${this.filePath}": ${(writeErr as Error).message}`,
        writeErr
      );
    }
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const data = await this.readData();
    const copy = { ...ticket, tags: [...ticket.tags] };
    data.tickets.push(copy);
    await this.writeData(data);
    return { ...copy };
  }

  async findById(id: string): Promise<Ticket | null> {
    const data = await this.readData();
    const found = data.tickets.find(t => t.id === id);
    if (!found) return null;
    return { ...found, tags: [...found.tags] };
  }

  async findAll(filter?: TicketFilter): Promise<Ticket[]> {
    const data = await this.readData();
    let result = data.tickets.map(t => ({
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
    const data = await this.readData();
    const index = data.tickets.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Ticket with ID ${id} not found in repository`);
    }

    const existing = data.tickets[index];
    const updated: Ticket = {
      ...existing,
      ...updates,
      id: existing.id, // prevent changing ID
      tags: updates.tags ? [...updates.tags] : [...existing.tags]
    };

    data.tickets[index] = updated;
    await this.writeData(data);
    return { ...updated };
  }

  async getNextId(): Promise<string> {
    const data = await this.readData();
    let maxId = 0;
    const regex = /^TICK-(\d+)$/;
    for (const ticket of data.tickets) {
      const match = ticket.id.match(regex);
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
}
