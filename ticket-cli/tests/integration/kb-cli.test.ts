import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { createCli, createKbCli } from '../../src/cli.js';
import { MockKBClient } from '../../src/kb/clients/mock-kb.client.js';
import { HTTPKBClient } from '../../src/kb/clients/http-kb.client.js';

describe('Knowledge Base CLI Integration Tests', () => {
  let output: string[];
  let errors: string[];
  let exitCode: number | null;
  let tempDir: string;

  beforeEach(async () => {
    output = [];
    errors = [];
    exitCode = null;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-cli-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const runKbCommand = async (args: string[], kbClient?: any) => {
    const { run } = createKbCli({
      kbClient: kbClient ?? new MockKBClient(),
      out: (msg: string) => output.push(msg),
      err: (msg: string) => errors.push(msg),
      exit: (code: number) => {
        exitCode = code;
      }
    });

    await run(['node', 'kb', ...args]);
  };

  const runTicketsKbCommand = async (args: string[], kbClient?: any) => {
    const { run } = createCli({
      kbClient: kbClient ?? new MockKBClient(),
      out: (msg: string) => output.push(msg),
      err: (msg: string) => errors.push(msg),
      exit: (code: number) => {
        exitCode = code;
      }
    });

    await run(['node', 'tickets', 'kb', ...args]);
  };

  describe('kb list command', () => {
    it('lists seeded documents in formatted table', async () => {
      await runKbCommand(['list']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-001');
      expect(fullOutput).toContain('Customer Response Template');
      expect(fullOutput).toContain('/templates/email');
      expect(fullOutput).toContain('Total documents: 3');
      expect(exitCode).toBeNull();
    });

    it('filters documents by nodePath hierarchy', async () => {
      await runKbCommand(['list', '--node', '/team/devops']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-002');
      expect(fullOutput).toContain('DevOps On-Call Schedule');
      expect(fullOutput).not.toContain('doc-001');
      expect(fullOutput).toContain('Total documents: 1');
    });

    it('respects --limit flag', async () => {
      await runKbCommand(['list', '--limit', '2']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('Total documents: 2');
    });

    it('validates invalid --limit input', async () => {
      await runKbCommand(['list', '--limit', 'invalid']);

      expect(errors.join('\n')).toContain('--limit must be a positive integer');
      expect(exitCode).toBe(1);
    });
  });

  describe('kb search command', () => {
    it('searches documents by query keyword', async () => {
      await runKbCommand(['search', 'response']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-001');
      expect(fullOutput).toContain('Customer Response Template');
      expect(fullOutput).toContain('Total matches found: 2');
    });

    it('respects --top-k option', async () => {
      await runKbCommand(['search', 'the', '--top-k', '1']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('Total matches found: 1');
    });

    it('reports when no matches found', async () => {
      await runKbCommand(['search', 'NonExistentTermXYZ']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('No documents found matching query "NonExistentTermXYZ"');
    });
  });

  describe('kb retrieve command', () => {
    it('retrieves full document content and metadata', async () => {
      await runKbCommand(['retrieve', 'doc-001']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-001');
      expect(fullOutput).toContain('Customer Response Template');
      expect(fullOutput).toContain('/templates/email');
      expect(fullOutput).toContain('Dear {{customer_name}}');
      expect(exitCode).toBeNull();
    });

    it('exits with code 1 and error message when document not found', async () => {
      await runKbCommand(['retrieve', 'doc-999']);

      expect(errors.join('\n')).toContain('Document with ID "doc-999" was not found');
      expect(exitCode).toBe(1);
    });
  });

  describe('kb add command', () => {
    it('adds document with inline options', async () => {
      await runKbCommand([
        'add',
        '--title',
        'Incident Runbook',
        '--content',
        'Steps for production incident handling',
        '--path',
        '/docs/runbooks',
        '--tags',
        'runbook,devops'
      ]);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('Document added to Knowledge Base successfully!');
      expect(fullOutput).toContain('doc-004');
      expect(fullOutput).toContain('Incident Runbook');
      expect(fullOutput).toContain('/docs/runbooks');
      expect(fullOutput).toContain('runbook, devops');
    });

    it('adds document from markdown file with header auto-detection', async () => {
      const sampleFile = path.join(tempDir, 'sms-template.md');
      await fs.writeFile(
        sampleFile,
        '# Order Shipped Template\n\nDear customer, order {{id}} has shipped.\n\nTracking: {{tracking_url}}',
        'utf-8'
      );

      await runKbCommand([
        'add',
        '--file',
        sampleFile,
        '--path',
        '/templates/sms',
        '--tags',
        'sms,order'
      ]);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('Document added to Knowledge Base successfully!');
      expect(fullOutput).toContain('Order Shipped Template');
      expect(fullOutput).toContain('/templates/sms');
    });

    it('reports error when reading non-existent file', async () => {
      await runKbCommand([
        'add',
        '--file',
        path.join(tempDir, 'does-not-exist.md'),
        '--path',
        '/templates/email'
      ]);

      expect(errors.join('\n')).toContain('Error reading file');
      expect(exitCode).toBe(1);
    });

    it('reports error when --path is missing', async () => {
      await runKbCommand(['add', '--title', 'Test', '--content', 'Test']);

      expect(errors.join('\n')).toContain('--path (or --node) is required');
      expect(exitCode).toBe(1);
    });
  });

  describe('Subcommand integration via tickets kb', () => {
    it('executes kb subcommands through main tickets CLI', async () => {
      await runTicketsKbCommand(['list']);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-001');
      expect(fullOutput).toContain('Customer Response Template');
    });
  });

  describe('End-to-End with HTTPKBClient', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          if (req.url === '/list') {
            res.writeHead(200);
            res.end(
              JSON.stringify({
                documents: [
                  {
                    id: 'doc-http-1',
                    title: 'Production HTTP Template',
                    content: 'HTTP content',
                    nodePath: '/templates/http',
                    tags: ['http']
                  }
                ]
              })
            );
            return;
          }
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        });
      });

      await new Promise<void>(resolve => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address() as AddressInfo;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
    });

    it('runs CLI commands transparently with HTTPKBClient', async () => {
      const httpClient = new HTTPKBClient({ baseUrl });
      await runKbCommand(['list'], httpClient);

      const fullOutput = output.join('\n');
      expect(fullOutput).toContain('doc-http-1');
      expect(fullOutput).toContain('Production HTTP Template');
      expect(fullOutput).toContain('/templates/http');
    });
  });
});
