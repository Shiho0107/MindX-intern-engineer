import * as http from 'node:http';
import { MockKBClient } from '../clients/mock-kb.client.js';

export function createKbServer(storageClient = new MockKBClient()): http.Server {
  const server = http.createServer(async (req, res) => {
    // CORS headers for local developer convenience
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? '/';
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');

      try {
        let payload: any = {};
        if (body.trim().length > 0) {
          try {
            payload = JSON.parse(body);
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
            return;
          }
        }

        if (req.method === 'GET' && url === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', service: 'MindX Knowledge Base API' }));
          return;
        }

        if (req.method === 'POST' && url === '/search') {
          const query = payload.query ?? '';
          const topK = payload.topK ? parseInt(payload.topK, 10) : 5;
          const results = await storageClient.search(query, { topK });
          res.writeHead(200);
          res.end(JSON.stringify({ results }));
          return;
        }

        if (req.method === 'POST' && url === '/list') {
          const limit = payload.limit ? parseInt(payload.limit, 10) : 10;
          const nodePath = payload.nodePath;
          const documents = await storageClient.list({ nodePath, limit });
          res.writeHead(200);
          res.end(JSON.stringify({ documents }));
          return;
        }

        if (req.method === 'POST' && url === '/retrieve') {
          const docId = payload.docId;
          if (!docId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Field "docId" is required' }));
            return;
          }
          const document = await storageClient.retrieve(docId);
          if (!document) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Document with ID "${docId}" not found` }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ document }));
          return;
        }

        if (req.method === 'POST' && url === '/add') {
          if (!payload.title || !payload.content || !payload.nodePath) {
            res.writeHead(400);
            res.end(
              JSON.stringify({
                error: 'Fields "title", "content", and "nodePath" are all required'
              })
            );
            return;
          }

          const document = await storageClient.add({
            title: payload.title,
            content: payload.content,
            nodePath: payload.nodePath,
            tags: payload.tags
          });

          res.writeHead(201);
          res.end(JSON.stringify({ document }));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: `Endpoint ${req.method} ${url} not found` }));
      } catch (err: unknown) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    });
  });

  return server;
}

// Auto-start server when run directly
if (process.argv[1] && process.argv[1].endsWith('kb-server.ts')) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = createKbServer();
  server.listen(PORT, () => {
    console.log(`[KB Server] MindX Knowledge Base API running on http://localhost:${PORT}`);
    console.log('[KB Server] Endpoints:');
    console.log('  - POST /search   { query: string, topK?: number }');
    console.log('  - POST /list     { nodePath?: string, limit?: number }');
    console.log('  - POST /retrieve { docId: string }');
    console.log('  - POST /add      { title, content, nodePath, tags }');
    console.log('  - GET  /health');
  });
}
