import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createCli } from '../../src/cli.js';

describe('CLI Integration Tests (End-to-End)', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-e2e-test-'));
    storagePath = path.join(tempDir, 'tickets.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on Windows
    }
  });

  // Helper to execute CLI commands in memory with real file persistence
  const execCli = async (
    args: string[]
  ): Promise<{ stdout: string[]; stderr: string[]; exitCode: number }> => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let exitCode = 0;

    const { run } = createCli({
      storagePath,
      out: (msg: string) => stdout.push(msg),
      err: (msg: string) => stderr.push(msg),
      exit: (code: number) => {
        exitCode = code;
      }
    });

    await run(['node', 'tickets', ...args]);

    return { stdout, stderr, exitCode };
  };

  it('runs complete lifecycle flow: create -> list -> show -> update -> list', async () => {
    // 1. Create a ticket
    const createRes = await execCli([
      'create',
      '--title',
      'Database connection timeout',
      '--description',
      'Pool exhausted under heavy load',
      '--priority',
      'high',
      '--tags',
      'db,backend'
    ]);

    expect(createRes.exitCode).toBe(0);
    const createOutput = createRes.stdout.join('\n');
    expect(createOutput).toContain('Ticket created successfully! [TICK-001]');
    expect(createOutput).toContain('Database connection timeout');

    // 2. List tickets
    const listRes = await execCli(['list']);
    expect(listRes.exitCode).toBe(0);
    const listOutput = listRes.stdout.join('\n');
    expect(listOutput).toContain('TICK-001');
    expect(listOutput).toContain('Database connection timeout');
    expect(listOutput).toContain('high');

    // 3. Show ticket details
    const showRes = await execCli(['show', 'TICK-001']);
    expect(showRes.exitCode).toBe(0);
    const showOutput = showRes.stdout.join('\n');
    expect(showOutput).toContain('Ticket TICK-001');
    expect(showOutput).toContain('Pool exhausted under heavy load');
    expect(showOutput).toContain('open');

    // 4. Update ticket status and priority
    const updateRes = await execCli([
      'update',
      'TICK-001',
      '--status',
      'in_progress',
      '--priority',
      'urgent'
    ]);
    expect(updateRes.exitCode).toBe(0);
    const updateOutput = updateRes.stdout.join('\n');
    expect(updateOutput).toContain('Ticket TICK-001 updated successfully!');
    expect(updateOutput).toContain('in_progress');
    expect(updateOutput).toContain('urgent');

    // 5. List with filter verifying updated attributes
    const listFiltered = await execCli([
      'list',
      '--status',
      'in_progress',
      '--tag',
      'db'
    ]);
    expect(listFiltered.exitCode).toBe(0);
    expect(listFiltered.stdout.join('\n')).toContain('TICK-001');
  });

  it('handles empty ticket list with friendly message', async () => {
    const res = await execCli(['list']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.join('\n')).toContain('No tickets found matching filters.');
  });

  it('fails with exit code 1 when creating ticket without required title', async () => {
    const res = await execCli([
      'create',
      '--description',
      'Missing title test'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain("required option '-t, --title <title>' not specified");
  });

  it('fails with exit code 1 when creating ticket without required description', async () => {
    const res = await execCli([
      'create',
      '--title',
      'Missing desc'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain("required option '-d, --description <desc>' not specified");
  });

  it('fails with exit code 1 when creating ticket with invalid priority', async () => {
    const res = await execCli([
      'create',
      '--title',
      'Invalid priority ticket',
      '--description',
      'Desc',
      '--priority',
      'super-critical'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('Invalid priority "super-critical"');
  });

  it('fails with exit code 1 when showing a non-existent ticket', async () => {
    const res = await execCli(['show', 'TICK-999']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('Ticket with ID "TICK-999" not found');
  });

  it('fails with exit code 1 when updating a non-existent ticket', async () => {
    const res = await execCli([
      'update',
      'TICK-999',
      '--status',
      'resolved'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('Ticket with ID "TICK-999" not found');
  });

  it('fails with exit code 1 when updating with invalid status value', async () => {
    // First create a ticket
    await execCli([
      'create',
      '--title',
      'To update',
      '--description',
      'Desc'
    ]);

    const res = await execCli([
      'update',
      'TICK-001',
      '--status',
      'invalid_status'
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('Invalid status "invalid_status"');
  });

  it('fails with exit code 1 when updating without any fields provided', async () => {
    await execCli([
      'create',
      '--title',
      'To update',
      '--description',
      'Desc'
    ]);

    const res = await execCli(['update', 'TICK-001']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('At least one field must be provided for update');
  });

  it('gracefully reports StorageError and exits with code 1 if JSON storage is corrupted', async () => {
    // Corrupt storage file
    await fs.writeFile(storagePath, 'BAD_JSON_CONTENT: {{{{', 'utf-8');

    const res = await execCli(['list']);
    expect(res.exitCode).toBe(1);
    expect(res.stderr.join('\n')).toContain('Failed to parse storage file');
  });
});
