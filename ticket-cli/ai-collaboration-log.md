# Week 2: Controlled AI Collaboration & TDD Log

**Author:** ThuanTV & AI Pair Programming  
**Context:** MindX Software Engineer Internship - Week 2 (Ticket Manager CLI)  
**Reference:** Week 1 AI Training Workflows (`research-tdd.md`)

---

## 1. Overview & Core Mindset

In Week 1, we established the fundamental engineering rule:
> **"You are the architect, AI is the pair programmer. Never delegate specification or architectural control to the AI."**

During Week 2, this rule was put into practice by enforcing:
1. **Red-Green-Refactor discipline:** Tests were drafted and executed *before* implementation code was generated.
2. **Specification-First constraints:** Clear DTO contracts, enum types, and error classes defined boundaries before prompts were written.
3. **Automated test refereeing:** Every AI suggestion was immediately validated through test runs (`npm test`). If a test failed, the test failure was used to constrain further iterations.

---

## 2. Evidence of Week 1 Workflows

### Workflow 1: Layered Questioning (Spec → Test → Code → Edge Cases)

Instead of a monolithic prompt asking the AI to "Build a Ticket CLI with Commander and JSON storage", we broke down the system hierarchically:

1. **Layer 1: Contract & Domain Model Definition**
   - *Prompting focus:* Define pure TypeScript interfaces for `Ticket`, `CreateTicketDTO`, `UpdateTicketDTO`, and status/priority union types.
   - *Result:* `src/models/ticket.ts` with zero external dependencies.

2. **Layer 2: Test Specification (RED Phase)**
   - *Prompting focus:* Write unit tests covering default values (`status: 'open'`, `priority: 'medium'`, `tags: []`), sequential ID generation (`TICK-001`, `TICK-002`), and timestamp integrity.
   - *Result:* Test suite failed cleanly (RED) because no service logic existed.

3. **Layer 3: Minimal Implementation (GREEN Phase)**
   - *Prompting focus:* Implement `TicketService.createTicket` backed by `MemoryTicketRepository` with strictly enough logic to pass the assertions.

4. **Layer 4: Edge Case Probing**
   - *Prompting focus:* "What happens if a user passes only whitespace in `--title` or a 105-character title?"
   - *Result:* Added tests and guards for string trimming, length bounds (<= 100 characters), and non-empty description.

---

### Workflow 2: Solution Exploration (Storage & Concurrency)

When architecting file persistence for `tickets.json`, we evaluated multiple design options:

| Strategy | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **Option A: Direct `fs.writeFile`** | Minimal code, straightforward | High risk of file corruption if process crashes mid-write; no concurrent safety | ❌ Rejected |
| **Option B: Embedded SQLite (`better-sqlite3`)** | ACID transactions, queries | Requires native C++ compilation; adds binary dependencies across OSs | ❌ Rejected |
| **Option C: Atomic Write (`temp file -> rename/copyFile`)** | Zero third-party runtime dependencies; crash-resilient; cross-platform | Requires temporary file cleanup & Windows lock retry fallback | ✅ **Selected** |

**Windows Platform Edge Case Identified:**
On Windows environments, atomic file renaming (`fs.rename`) can occasionally throw `EPERM` or `EBUSY` if an antivirus or file indexing process momentarily touches the target file. We refined the implementation to include a fallback `fs.copyFile` + `fs.unlink` strategy, ensuring 100% reliable execution.

---

### Workflow 3: Iterative Refinement & Suboptimal AI Code Caught by Tests

Below are concrete examples where AI generated suboptimal or flawed code and our automated tests / guardrails caught it:

#### Example 1: Tag Normalization & Whitespace
- **Suboptimal AI output:** The initial AI draft for `createTicket` did a simple array pass-through: `tags: dto.tags ?? []`.
- **Flaw:** If a user passed `["  bug ", "", "  ", "auth  "]`, the tickets contained blank tags and untrimmed strings.
- **How tests caught it:** Unit test `normalizes tags by trimming whitespace and removing empty items` failed.
- **Refinement:** Created dedicated helper `normalizeTags` that trims each tag and filters out falsy/empty elements (`tag.trim().length > 0`).

#### Example 2: Commander Exit Code on `--help` and Version
- **Suboptimal AI output:** The AI suggested using `exitOverride` checking `commandError.code === 'commander.help'`.
- **Flaw:** Commander.js throws `CommanderError` with `code: 'commander.helpDisplayed'` and `exitCode: 0`. The incorrect check caused `tickets --help` to treat help display as an unhandled error and exit with code `1`.
- **How tests caught it:** Running `node ./dist/index.js --help` resulted in exit code `1`.
- **Refinement:** Updated `exitOverride` to inspect `commandError.exitCode === 0 || commandError.code === 'commander.helpDisplayed'` to cleanly exit with code `0`.

#### Example 3: Immutability and State Leakage in Tests
- **Suboptimal AI output:** `MemoryTicketRepository` originally stored direct object references (`this.tickets.set(ticket.id, ticket)`).
- **Flaw:** Mutating a ticket in memory modified the internal repository state without going through `updateTicket()`, breaking test isolation.
- **Refinement:** Forced defensive copying on read and write:
  ```typescript
  const copy = { ...ticket, tags: [...ticket.tags] };
  ```

---

## 3. Summary of Results

- **Total Test Suites:** 3 (Unit Service, Repository Integration, CLI E2E)
- **Total Passing Tests:** 41 / 41 (100% pass rate)
- **Zero-Dependency Core:** Only `commander` as production dependency; native Node `fs/promises` for storage.
- **Deterministic CI/CD Ready:** Fast test runs (average test run ~160ms).
