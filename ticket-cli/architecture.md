# Week 2 Architecture: Ticket Manager CLI

**Authors:** ThuanTV, Cursor AI  
**Focus:** Maintainable layered CLI architecture with TDD and JSON file storage

---

## Current State & Context

```
Week 1: AI Training & TDD Research
├─ Core mindset: You are the architect, AI is the pair programmer
├─ 3 Core workflows: Layered Questioning, Solution Exploration, Iterative Refinement
└─ Research deliverables: TDD principles, Red-Green-Refactor, test types

Week 2: Ticket Manager CLI (Current)
├─ Hands-on TDD: Failing test → minimal code → passing test → refactor
├─ Simple layered architecture: Commands → Services → Repositories → Models
├─ Local JSON file storage with resilience & error handling
└─ 4 Core commands: create, list, show, update

Week 3: Add Knowledge Base API (Next)
└─ Extends Week 2 CLI with HTTP Client and external API integration
```

---

## Layered Architecture

To keep the CLI maintainable, testable, and extensible for Week 3, the codebase is structured into 4 isolated layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLI Commands Layer                        │
│   (tickets create, tickets list, tickets show, tickets update)  │
│   • Parses CLI args/flags via Commander.js                      │
│   • Formats console output & tables                             │
│   • Catches errors and sets exit codes                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Calls service
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Ticket Service Layer                        │
│   • Enforces business logic & validation rules                  │
│   • Generates unique IDs and timestamps (createdAt, updatedAt)  │
│   • Orchestrates queries, filters, and status transitions       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Uses repository interface
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Ticket Repository Interface                    │
│   ITicketRepository: create, findById, findAll, update          │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│   JsonFileTicketRepository    │ │     MemoryTicketRepository    │
│   (Production / Integration)  │ │     (Fast Unit Testing)       │
│   • Reads/writes tickets.json │ │     • In-memory Map / array   │
│   • Handles missing files     │ │     • Zero file I/O overhead  │
│   • Validates corrupted JSON  │ │     • Pure deterministic state│
└───────────────────────────────┘ └───────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Domain Models Layer                        │
│   • Ticket, TicketStatus, TicketPriority                        │
│   • CreateTicketDTO, UpdateTicketDTO, TicketFilter              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Domain Model & Data Schema

### Ticket Interface

```typescript
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;               // e.g., "TICK-001" or UUID
  title: string;            // Required, 1-100 characters
  description: string;      // Required, non-empty
  status: TicketStatus;     // Defaults to 'open'
  priority: TicketPriority; // Defaults to 'medium'
  tags: string[];           // Array of string tags (e.g., ["bug", "auth"])
  createdAt: string;        // ISO 8601 string (e.g., "2026-10-21T10:00:00.000Z")
  updatedAt: string;        // ISO 8601 string
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority?: TicketPriority;
  tags?: string[];
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  tag?: string;
}
```

### JSON Storage Schema (`tickets.json`)

```json
{
  "version": 1,
  "updatedAt": "2026-10-21T10:00:00.000Z",
  "tickets": [
    {
      "id": "TICK-001",
      "title": "Fix login authentication error",
      "description": "Users receive 500 error when submitting expired session token",
      "status": "open",
      "priority": "high",
      "tags": ["auth", "bug"],
      "createdAt": "2026-10-21T09:30:00.000Z",
      "updatedAt": "2026-10-21T09:30:00.000Z"
    }
  ]
}
```

---

## CLI Command Specifications

The CLI provides 4 commands under the `tickets` program:

### 1. `tickets create`
Create a new ticket and persist it to JSON storage.

```bash
tickets create --title "Database timeout" --description "Connections pool exhausted" --priority high --tags "db,backend"
```
- **Flags:**
  - `-t, --title <title>` (required)
  - `-d, --description <desc>` (required)
  - `-p, --priority <priority>` (optional, default: `medium`)
  - `--tags <tags>` (optional, comma-separated, default: `[]`)
- **Output:** Success message with generated ID and summary table.

### 2. `tickets list`
List tickets with optional multi-attribute filtering.

```bash
tickets list --status open --priority high --tag backend
```
- **Flags:**
  - `-s, --status <status>` (optional filter)
  - `-p, --priority <priority>` (optional filter)
  - `--tag <tag>` (optional filter)
- **Output:** Formatted table containing ID, Title, Status, Priority, Tags, and Updated At.

### 3. `tickets show <id>`
Display complete ticket details.

```bash
tickets show TICK-001
```
- **Arguments:**
  - `<id>`: Ticket ID to view
- **Output:** Detailed view including description, full timestamps, and history/metadata.
- **Error:** Exits with code 1 and error message if ticket ID does not exist.

### 4. `tickets update <id>`
Update status, priority, or content of an existing ticket.

```bash
tickets update TICK-001 --status in_progress --priority urgent
```
- **Arguments:**
  - `<id>`: Ticket ID to update
- **Flags:**
  - `-s, --status <status>` (optional)
  - `-p, --priority <priority>` (optional)
  - `-t, --title <title>` (optional)
  - `-d, --description <desc>` (optional)
  - `--tags <tags>` (optional, comma-separated)
- **Output:** Success message with before/after status or updated ticket summary.

---

## Error Handling Architecture

| Scenario | Layer Handled | Behavior & Response |
| :--- | :--- | :--- |
| **Missing required fields** (e.g. empty title) | Domain / Service | Throws `ValidationError`, CLI displays error in red and returns exit code 1 |
| **Invalid status/priority value** | Domain / Service | Rejects value with list of allowed enum options |
| **Ticket ID not found** | Service / Repository | Throws `TicketNotFoundError`, CLI prints `Error: Ticket [ID] not found` |
| **Missing storage file** | Storage Repository | Auto-initializes an empty JSON database `{ "version": 1, "tickets": [] }` |
| **Corrupted JSON file** | Storage Repository | Catches parse error, surfaces descriptive message without crashing ungracefully |
| **Concurrent / safe writes** | Storage Repository | Uses atomic write pattern (write to temp file then rename) to prevent file corruption |

---

## Testing Strategy & Matrix

Following Week 1 research, tests are divided into three clear levels:

```
┌────────────────────────────────────────────────────────┐
│             CLI Integration / E2E Tests                │
│ • Execute full CLI binary via subprocess / execa       │
│ • Verify stdout, stderr, and exit codes                │
│ • Real file I/O using isolated temp directory          │
├────────────────────────────────────────────────────────┤
│             Repository Integration Tests               │
│ • JsonFileTicketRepository with real fs                │
│ • Test file creation, persistence, corruption recovery │
├────────────────────────────────────────────────────────┤
│                 Domain / Service Unit Tests            │
│ • 100% in-memory (using MemoryTicketRepository)       │
│ • Fast, deterministic, test all business rules & edges │
└────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Runtime:** Node.js (v18+ or v20+ LTS)
- **Language:** TypeScript
- **CLI Framework:** Commander.js
- **Testing Framework:** Vitest (or Jest)
- **File System:** Node.js native `fs/promises` with atomic write pattern
