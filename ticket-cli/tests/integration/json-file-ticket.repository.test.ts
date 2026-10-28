import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { JsonFileTicketRepository } from '../../src/repositories/json-file-ticket.repository.js';
import { StorageError } from '../../src/errors/ticket-errors.js';
import { Ticket } from '../../src/models/ticket.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    default: {
      ...actual,
      rename: vi.fn((...args: Parameters<typeof actual.rename>) => actual.rename(...args))
    },
    rename: vi.fn((...args: Parameters<typeof actual.rename>) => actual.rename(...args))
  };
});


describe('JsonFileTicketRepository Integration Tests', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ticket-cli-test-'));
    storagePath = path.join(tempDir, 'subfolder', 'tickets.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors on Windows
    }
  });

  it('auto-initializes file and parent directory if not existing', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    const tickets = await repo.findAll();

    expect(tickets).toEqual([]);

    const fileContent = await fs.readFile(storagePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    expect(parsed.version).toBe(1);
    expect(parsed.tickets).toEqual([]);
    expect(parsed.updatedAt).toBeDefined();
  });

  it('persists tickets across different repository instances', async () => {
    const repo1 = new JsonFileTicketRepository(storagePath);
    const newTicket: Ticket = {
      id: 'TICK-001',
      title: 'Persistent Ticket',
      description: 'Stored in file',
      status: 'open',
      priority: 'high',
      tags: ['storage', 'integration'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await repo1.create(newTicket);

    // Create a new instance pointing to the exact same file
    const repo2 = new JsonFileTicketRepository(storagePath);
    const found = await repo2.findById('TICK-001');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('TICK-001');
    expect(found?.title).toBe('Persistent Ticket');
    expect(found?.priority).toBe('high');
    expect(found?.tags).toEqual(['storage', 'integration']);
  });

  it('generates sequential IDs based on existing tickets', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    expect(await repo.getNextId()).toBe('TICK-001');

    await repo.create({
      id: 'TICK-001',
      title: 'T1',
      description: 'D1',
      status: 'open',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(await repo.getNextId()).toBe('TICK-002');

    // If there's a jump in IDs
    await repo.create({
      id: 'TICK-007',
      title: 'T7',
      description: 'D7',
      status: 'open',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(await repo.getNextId()).toBe('TICK-008');
  });

  it('updates an existing ticket in storage', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    await repo.create({
      id: 'TICK-001',
      title: 'Original Title',
      description: 'Original Desc',
      status: 'open',
      priority: 'low',
      tags: ['init'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const updated = await repo.update('TICK-001', {
      title: 'Updated Title',
      status: 'in_progress',
      tags: ['init', 'wip']
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.status).toBe('in_progress');
    expect(updated.tags).toEqual(['init', 'wip']);

    // Verify reading from disk
    const found = await repo.findById('TICK-001');
    expect(found?.title).toBe('Updated Title');
    expect(found?.status).toBe('in_progress');
  });

  it('throws error when updating non-existent ticket in repository', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    await expect(repo.update('TICK-999', { status: 'closed' })).rejects.toThrow(
      'Ticket with ID TICK-999 not found'
    );
  });

  it('filters tickets by status, priority, and tag', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    await repo.create({
      id: 'TICK-001',
      title: 'Bug A',
      description: 'Desc',
      status: 'open',
      priority: 'high',
      tags: ['bug', 'ui'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await repo.create({
      id: 'TICK-002',
      title: 'Bug B',
      description: 'Desc',
      status: 'closed',
      priority: 'low',
      tags: ['bug', 'backend'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const openTickets = await repo.findAll({ status: 'open' });
    expect(openTickets.length).toBe(1);
    expect(openTickets[0].id).toBe('TICK-001');

    const backendTickets = await repo.findAll({ tag: 'backend' });
    expect(backendTickets.length).toBe(1);
    expect(backendTickets[0].id).toBe('TICK-002');
  });

  it('throws descriptive StorageError when JSON file is corrupted', async () => {
    // Write invalid JSON to storagePath
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, 'CORRUPTED JSON CONTENT { "not_valid": ', 'utf-8');

    const repo = new JsonFileTicketRepository(storagePath);
    await expect(repo.findAll()).rejects.toThrow(StorageError);
    await expect(repo.findAll()).rejects.toThrow(/Failed to parse storage file/);
  });

  it('fails safely and preserves original file data when I/O error occurs during write/rename', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    await repo.create({
      id: 'TICK-001',
      title: 'Initial Ticket',
      description: 'Must survive I/O error',
      status: 'open',
      priority: 'high',
      tags: ['critical'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const contentBefore = await fs.readFile(storagePath, 'utf-8');

    // Simulate an I/O failure on rename (e.g. disk failure or permission error)
    vi.mocked(fs.rename).mockRejectedValueOnce(new Error('Simulated I/O disk failure on rename'));

    await expect(
      repo.create({
        id: 'TICK-002',
        title: 'Unsafe Ticket',
        description: 'Should not corrupt storage',
        status: 'open',
        priority: 'medium',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ).rejects.toThrow(StorageError);

    // Verify that the existing storage file remained completely untouched (fail-safe)
    const contentAfter = await fs.readFile(storagePath, 'utf-8');
    expect(contentAfter).toBe(contentBefore);

    // Verify no temporary files were left behind in the storage directory
    const dirFiles = await fs.readdir(path.dirname(storagePath));
    const tempFiles = dirFiles.filter(f => f.includes('.tmp.'));
    expect(tempFiles).toEqual([]);
  });
});

