# Week 3: Knowledge Base API Integration Guide

**Author:** Nguyễn Minh Chiến (GitHub: @Shiho0107) & Controlled AI Collaboration  
**Context:** MindX Software Engineer Internship - Week 3  
**Focus:** Extending Ticket CLI with Knowledge Base API Integration (Templates, Documents, Team Info)  

---

## 1. Overview & System Goals

Week 3 extends the command-line suite from Week 2 by integrating with an external **Knowledge Base (KB) API**. Real-world engineering teams need instant terminal access to:
- **Email & Customer Support Templates** (e.g., `/templates/email`, `/templates/sms`)
- **Team Information & On-Call Schedules** (e.g., `/team/devops`, `/team/backend`)
- **Technical Guides & Runbooks** (e.g., `/docs/guides`, `/docs/runbooks`)

### Core Architectural Principles
1. **Mock-First Integration Strategy:** Develop against a fast, in-memory `MockKBClient` first to specify behavior and CLI contracts via unit tests.
2. **Production-Ready HTTP Client:** Implement `HTTPKBClient` adhering to the same interface contract (`IKBClient`), using native `node:fetch` with zero third-party runtime dependencies.
3. **Environment-Driven Polymorphism:** Seamlessly toggle between `MockKBClient` and `HTTPKBClient` via `KB_CLIENT_TYPE=mock|http` or `KB_API_URL`.
4. **Resilient Error Taxonomy:** Distinct, actionable errors (`KBValidationError`, `KBNotFoundError`, `KBConnectionError`).

---

## 2. Architecture & Design

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLI Presentation Layer                        │
│                                                                        │
│   tickets kb <subcommand>                 kb <command>                 │
│   • kb search <query> [--top-k]           • kb list [--node] [--limit] │
│   • kb retrieve <docId>                   • kb add [--file] [--path]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Injected dependency
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        IKBClient Interface                             │
│                                                                        │
│   • search(query: string, options?: SearchOptions): Promise<Results>   │
│   • list(options?: ListOptions): Promise<KBDocument[]>                 │
│   • retrieve(docId: string): Promise<KBDocument | null>                │
│   • add(dto: AddDocumentDTO): Promise<KBDocument>                      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│            MockKBClient              │  │         HTTPKBClient         │
│  • In-memory storage & indexing      │  │  • Native Node fetch API     │
│  • Seeded real-world documents       │  │  • AbortController timeout  │
│  • Fast, deterministic testing       │  │  • Robust error mapping      │
└──────────────────────────────────────┘  └──────────────┬───────────────┘
                                                         │ HTTP POST
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │      Knowledge Base API      │
                                          │  • POST /search              │
                                          │  • POST /list                │
                                          │  • POST /retrieve            │
                                          │  • POST /add                 │
                                          │  • GET  /health              │
                                          └──────────────────────────────┘
```

---

## 3. Knowledge Base Node Hierarchy & Data Models

### Node Hierarchy Structure
```text
KB Root
├── /templates
│   ├── /email
│   │   └── doc-001: Customer Response Template
│   └── /sms
│       └── doc-004: SMS Shipping Notification
├── /team
│   └── /devops
│       └── doc-002: DevOps On-Call Schedule & Contacts
└── /docs
    ├── /guides
    │   └── doc-003: API Integration Best Practices
    └── /runbooks
```

### Domain Interfaces (`src/kb/models/kb-document.ts`)

```typescript
export interface KBDocument {
  id: string;          // e.g., "doc-001"
  title: string;       // e.g., "Customer Response Template"
  content: string;     // Full Markdown text
  nodePath: string;    // e.g., "/templates/email"
  tags: string[];      // e.g., ["template", "email", "support"]
  createdAt?: string;  // ISO 8601
  updatedAt?: string;  // ISO 8601
}

export interface KBSearchResult {
  id: string;
  title: string;
  nodePath: string;
  tags?: string[];
  snippet?: string;
  matchType?: 'title' | 'tag' | 'content';
  score?: number;
}

export interface AddDocumentDTO {
  title: string;
  content: string;
  nodePath: string;
  tags?: string[];
}
```

---

## 4. HTTP API Protocol & Contract

All KB API operations use HTTP POST with JSON bodies to allow complex filtering and arbitrary query bodies without URL length restrictions:

### 1. Search: `POST /search`
- **Request Body:**
  ```json
  {
    "query": "response",
    "topK": 5
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "id": "doc-001",
        "title": "Customer Response Template",
        "nodePath": "/templates/email",
        "tags": ["template", "email", "support"],
        "matchType": "title",
        "snippet": "Dear {{customer_name}}, thank you for reaching out..."
      }
    ]
  }
  ```

### 2. List: `POST /list`
- **Request Body:**
  ```json
  {
    "nodePath": "/templates",
    "limit": 10
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "documents": [
      {
        "id": "doc-001",
        "title": "Customer Response Template",
        "nodePath": "/templates/email",
        "tags": ["template", "email"],
        "content": "..."
      }
    ]
  }
  ```

### 3. Retrieve: `POST /retrieve`
- **Request Body:**
  ```json
  {
    "docId": "doc-001"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "document": {
      "id": "doc-001",
      "title": "Customer Response Template",
      "nodePath": "/templates/email",
      "tags": ["template", "email", "support"],
      "content": "# Customer Response Template\n\nDear {{customer_name}}..."
    }
  }
  ```
- **Response if not found (404 Not Found):**
  ```json
  {
    "error": "Document with ID \"doc-999\" not found"
  }
  ```

### 4. Add: `POST /add`
- **Request Body:**
  ```json
  {
    "title": "SMS Notification Template",
    "content": "Your order {{order_id}} has been shipped!",
    "nodePath": "/templates/sms",
    "tags": ["template", "sms"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "document": {
      "id": "doc-004",
      "title": "SMS Notification Template",
      "nodePath": "/templates/sms",
      "tags": ["template", "sms"],
      "createdAt": "2026-10-29T00:00:00.000Z"
    }
  }
  ```

---

## 5. CLI Commands Reference & Examples

Both invocations (`tickets kb <command>` and direct `kb <command>`) are fully supported:

### 1. `kb search <query> [--top-k <n>]`
Search documents by keyword across titles, tags, and Markdown bodies:
```bash
# Search for templates matching "response"
tickets kb search "response" --top-k 3
```

### 2. `kb list [--node <path>] [--limit <n>]`
List all documents or filter by folder prefix:
```bash
# List only templates
tickets kb list --node /templates

# List team documents up to 5 items
tickets kb list --node /team --limit 5
```

### 3. `kb retrieve <docId>`
Display complete document details and formatted Markdown content:
```bash
tickets kb retrieve doc-001
```

### 4. `kb add [--file <path>] [--path <nodePath>] [--tags <tags>]`
Add new documents from local files or CLI arguments:
```bash
# Add from markdown file (title auto-extracted from '# Title')
tickets kb add --file ./new-template.md --path /templates/sms --tags sms,shipping

# Add inline content
tickets kb add --title "Incident Playbook" --content "Check CPU metrics" --path /docs/runbooks --tags incident
```

---

## 6. How to Run & Environment Variable Configuration

### Development Mode (Mock Client - Default)
No network setup required. Uses `MockKBClient` seeded with 3 realistic documents:
```bash
# Run with tickets CLI
npm start kb list

# Or run dedicated kb binary
npm run kb list
```

### Production / Real API Mode (HTTPKBClient)
1. **Start the local Knowledge Base API Server:**
   ```bash
   npm run kb:server
   # Server listens on http://localhost:3000
   ```
2. **Configure environment variables in terminal:**
   - **PowerShell (Windows):**
     ```powershell
     $env:KB_CLIENT_TYPE = "http"
     $env:KB_API_URL = "http://localhost:3000"
     npm start kb list
     ```
   - **Bash / Linux / macOS:**
     ```bash
     export KB_CLIENT_TYPE="http"
     export KB_API_URL="http://localhost:3000"
     npm start kb list
     ```

---

## 7. Verification & Acceptance Criteria Checklist

| Acceptance Criterion | Implementation & Evidence | Status |
| :--- | :--- | :---: |
| **1. CLI queries KB for real use cases** | Seeded and HTTP documents for templates (`/templates/email`), team schedules (`/team/devops`), and guides (`/docs/guides`). | ✅ **Pass** |
| **2. Swappable Mock & HTTP clients** | `createKBClient` factory handles `KB_CLIENT_TYPE=mock|http` and `KB_API_URL` seamlessly. Unit tested in `tests/unit/kb-client.factory.test.ts`. | ✅ **Pass** |
| **3. All 4 commands functional end-to-end** | `search`, `list`, `retrieve`, `add` covered by 15 integration tests in `tests/integration/kb-cli.test.ts`. | ✅ **Pass** |
| **4. Integration with real KB API tested & documented** | Native HTTP test server and standalone `kb:server` tested in `tests/integration/http-kb-client.test.ts` and `tests/unit/kb-server.test.ts`. | ✅ **Pass** |
| **5. Test Suite Quality & Zero-Dependency** | **87 / 87 tests passing (100%)**. Only native `node:fetch` used for HTTP calls. | ✅ **Pass** |
