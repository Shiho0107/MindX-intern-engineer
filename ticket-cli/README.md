# Ticket Manager CLI (ticket-cli)

> Production-grade Ticket Manager CLI built using **Test-Driven Development (TDD)**, **Layered Architecture**, and **Controlled AI Workflows** for MindX Software Engineer Internship - Week 2.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [CLI Command Guide](#cli-command-guide)
  - [1. Create Ticket (`tickets create`)](#1-create-ticket-tickets-create)
  - [2. List Tickets (`tickets list`)](#2-list-tickets-tickets-list)
  - [3. Show Ticket Details (`tickets show`)](#3-show-ticket-details-tickets-show)
  - [4. Update Ticket (`tickets update`)](#4-update-ticket-tickets-update)
- [Knowledge Base API Integration (Week 3)](#knowledge-base-api-integration-week-3)
  - [1. Search KB (`tickets kb search`)](#1-search-kb-tickets-kb-search)
  - [2. List Documents (`tickets kb list`)](#2-list-documents-tickets-kb-list)
  - [3. Retrieve Document (`tickets kb retrieve`)](#3-retrieve-document-tickets-kb-retrieve)
  - [4. Add Document (`tickets kb add`)](#4-add-document-tickets-kb-add)
  - [Mock vs. HTTP Client Configuration](#mock-vs-http-client-configuration)
- [Data Storage Schema](#data-storage-schema)
- [Error Handling & Resilience](#error-handling--resilience)
- [Controlled AI Workflows & Verification](#controlled-ai-workflows--verification)

---

## Overview

The **Ticket Manager CLI** (`ticket-cli`) is a developer-friendly command-line application for managing tasks, bugs, and tickets locally with JSON persistence.

Key achievements:
- **100% Test-Driven Development (TDD):** Every feature developed strictly through Red-Green-Refactor cycles.
- **Isolated 4-Layer Architecture:** Pure separation of presentation, domain rules, persistence interfaces, and data models.
- **Resilient Local Storage:** Atomic writes (`temp file -> rename`), automatic initialization, and corrupt file detection.
- **Standard Exit Codes:** Follows POSIX/CLI standards (`0` for success, `1` for validation/storage/not found errors).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLI Commands Layer                        │
│   (tickets create, tickets list, tickets show, tickets update)  │
│   • Parses CLI args/flags via Commander.js                      │
│   • Formats console output, tables, and cards                   │
│   • Injected output/error/exit streams for headless testing     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Calls service
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Ticket Service Layer                        │
│   • Enforces business logic & validation rules                  │
│   • Generates sequential IDs (TICK-001) & ISO 8601 timestamps   │
│   • Orchestrates queries, filters, and status transitions       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Uses repository interface
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ITicketRepository Interface                    │
│   create, findById, findAll, update, getNextId                  │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│   JsonFileTicketRepository    │ │     MemoryTicketRepository    │
│   (Production / Integration)  │ │     (Fast Unit Testing)       │
│   • Atomic writes (temp file) │ │     • In-memory Map           │
│   • Auto-initializes schema   │ │     • Zero file I/O overhead  │
│   • Graceful corrupt JSON     │ │     • 100% deterministic      │
└───────────────────────────────┘ └───────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Domain Models Layer                        │
│   • Ticket, TicketStatus, TicketPriority                        │
│   • CreateTicketDTO, UpdateTicketDTO, TicketFilter              │
│   • Custom Errors: ValidationError, TicketNotFoundError,        │
│                    StorageError                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Runtime:** Node.js (v18+, v20+, v24 LTS)
- **Language:** TypeScript 5.8 (Strict mode, ES Modules)
- **CLI Framework:** Commander.js 13
- **Test Framework:** Vitest 3
- **Transpiler & Runner:** `tsc` + `tsx`
- **File System:** Node native `fs/promises` with atomic write pattern

---

## Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

```bash
# Clone the repository and navigate to ticket-cli
cd ticket-cli

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Link binary globally (recommended: enables direct 'tickets' command)
npm link
```

### Running Locally

Once linked with `npm link`, you can run the CLI directly from any terminal:

```bash
# Direct command (via npm link)
tickets --help
tickets list

# Or during development without compiling (runs tsx on source code directly)
npm start -- list
npm start -- --help

# Or via compiled JavaScript directly
node ./dist/index.js --help
```

---

## Testing & Quality Assurance

The project adheres to the testing pyramid defined in Week 1 research:
1. **Unit Tests (100% in-memory):** High-speed tests using `MemoryTicketRepository` to validate business rules, validation bounds, tag normalization, and status transitions.
2. **Repository Integration Tests:** Tests `JsonFileTicketRepository` with real temporary file systems, checking auto-creation, atomic writes, and corrupt JSON recovery.
3. **CLI End-to-End Tests:** Tests complete user command flows (`create -> list -> show -> update -> list`), verifying terminal outputs, tables, and exit codes.

### Running Tests

```bash
# Run all tests (Unit + Integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

---

## CLI Command Guide

### 1. Create Ticket (`tickets create`)

Creates a new ticket and saves it to local JSON storage.

```bash
tickets create -t "<title>" -d "<description>" [-p <priority>] [--tags "<tags>"]
```

**Options:**
- `-t, --title <title>`: Ticket title (**required**, 1–100 characters)
- `-d, --description <desc>`: Ticket description (**required**, non-empty)
- `-p, --priority <priority>`: Priority: `low`, `medium`, `high`, `urgent` (optional, default: `medium`)
- `--tags <tags>`: Comma-separated list of tags (optional, e.g. `auth,bug,frontend`)

**Example:**
```bash
tickets create -t "Fix auth expiration" -d "JWT token expires prematurely" -p high --tags "auth,bug"
```

---

### 2. List Tickets (`tickets list`)

Lists tickets in a formatted ASCII table with optional filters.

```bash
tickets list [-s <status>] [-p <priority>] [--tag <tag>]
```

**Options:**
- `-s, --status <status>`: Filter by status (`open`, `in_progress`, `resolved`, `closed`)
- `-p, --priority <priority>`: Filter by priority (`low`, `medium`, `high`, `urgent`)
- `--tag <tag>`: Filter by tag (case-insensitive)

**Example:**
```bash
tickets list -s open -p high --tag auth
```

---

### 3. Show Ticket Details (`tickets show`)

Displays the full card view of a ticket by its ID.

```bash
tickets show <id>
```

**Example:**
```bash
tickets show TICK-001
```

If the ticket is not found, displays an error message and exits with code `1`:
```
Error: Ticket with ID "TICK-999" not found.
```

---

### 4. Update Ticket (`tickets update`)

Updates status, priority, title, description, or tags of an existing ticket.

```bash
tickets update <id> [options]
```

**Options:**
- `-s, --status <status>`: New status (`open`, `in_progress`, `resolved`, `closed`)
- `-p, --priority <priority>`: New priority (`low`, `medium`, `high`, `urgent`)
- `-t, --title <title>`: New title (1–100 chars)
- `-d, --description <desc>`: New description
- `--tags <tags>`: Comma-separated list of tags

**Example:**
```bash
tickets update TICK-001 --status in_progress --priority urgent
```

---

## Knowledge Base API Integration (Week 3)

The CLI integrates with an external Knowledge Base (KB) API to query email templates, DevOps schedules, and technical guides. Full architectural details and sequence diagrams are in [`docs/week-3-kb-integration.md`](./docs/week-3-kb-integration.md).

Commands can be invoked either as subcommands via `tickets kb <command>` or directly via the dedicated binary `kb <command>`.

### 1. Search KB (`tickets kb search`)
Search documents by keyword across titles, tags, and Markdown bodies:
```bash
# Search for customer response templates
tickets kb search "response" --top-k 3

# Or with standalone kb binary
kb search "schedule"
```

### 2. List Documents (`tickets kb list`)
List documents with optional node hierarchy path filtering:
```bash
# List all templates
tickets kb list --node /templates

# List team documents up to 5 items
tickets kb list --node /team/devops --limit 5
```

### 3. Retrieve Document (`tickets kb retrieve`)
Display complete document details and formatted Markdown body:
```bash
tickets kb retrieve doc-001
```

### 4. Add Document (`tickets kb add`)
Add a new document from a local markdown file or inline options:
```bash
# Add from markdown file (title auto-extracted from first '# Header')
tickets kb add --file ./template.md --path /templates/sms --tags sms,shipping

# Add inline content
tickets kb add --title "Dev Guide" --content "Setup steps..." --path /docs/guides --tags guide,dev
```

### Mock vs. HTTP Client Configuration
Clients are swappable via environment variables:
- **Default (Mock Client):** No server needed; uses seeded in-memory client.
- **HTTP Mode (Real API):**
  1. Start the local KB server: `npm run kb:server`
  2. Set environment variables:
     ```bash
     export KB_CLIENT_TYPE="http"
     export KB_API_URL="http://localhost:3000"
     ```
     *(In PowerShell: `$env:KB_CLIENT_TYPE="http"; $env:KB_API_URL="http://localhost:3000"`)*

---

## Data Storage Schema

Local storage is maintained in `tickets.json` at the root of the project (or configured path):

```json
{
  "version": 1,
  "updatedAt": "2026-10-21T11:48:42.093Z",
  "tickets": [
    {
      "id": "TICK-001",
      "title": "Fix auth expiration",
      "description": "JWT token expires prematurely",
      "status": "in_progress",
      "priority": "urgent",
      "tags": ["auth", "bug"],
      "createdAt": "2026-10-21T11:46:42.094Z",
      "updatedAt": "2026-10-21T11:48:42.091Z"
    }
  ]
}
```

---

## Error Handling & Resilience

| Scenario | Handling Mechanism | Outcome | Exit Code |
| :--- | :--- | :--- | :--- |
| **Missing required fields** | `ValidationError` in `TicketService` | Friendly error message in red | `1` |
| **Invalid Enum value** | Validated against `VALID_STATUSES` & `VALID_PRIORITIES` | Lists valid allowed options | `1` |
| **Ticket ID not found** | `TicketNotFoundError` | `Error: Ticket with ID "..." not found.` | `1` |
| **Storage file missing** | `JsonFileTicketRepository` auto-initializes | Auto-creates directory & empty schema | `0` |
| **Corrupted JSON file** | Wrapped in `StorageError` | Explains syntax issue clearly | `1` |
| **Concurrent / safe writes** | Atomic write pattern | Temp file written first, then renamed | `0` |

---

## Controlled AI Workflows & Verification

See [`ai-collaboration-log.md`](./ai-collaboration-log.md) for detailed documentation of how Week 1 AI collaboration workflows (**Layered Questioning**, **Solution Exploration**, and **Iterative Refinement**) were applied during development, including guardrails that caught AI hallucinations and edge case omissions.
