# Week 2: Controlled AI Collaboration & TDD Log
### Attribution & Roles
- **Nguyễn Minh Chiến (Engineer & Architect):** Sets architectural requirements, domain contracts (`src/models/ticket.ts`), test specifications, identifies data safety hazards (rejecting unsafe `copyFile` fallback and specifying fail-safe atomic persistence), reviews and refactors AI-generated code, referees automated test suites, and manages Git commits.
- **AI Pair Programmer:** Generates minimal implementations and test scaffolding under strict constraints, guided by type contracts and failing test assertions.

---

## 1. Overview & Core Mindset

In Week 1, we established the fundamental engineering rule:
> **"You are the architect, AI is the pair programmer. Never delegate specification or architectural control to the AI."**

During Week 2, this rule was put into practice by enforcing:
1. **Red-Green-Refactor discipline:** Tests were drafted and executed *before* implementation code was generated, verified through distinct git commits.
2. **Specification-First constraints:** Clear DTO contracts, enum types, and error classes defined boundaries before prompts were written.
3. **Automated test refereeing:** Every AI suggestion was immediately validated through test runs (`npm test`). If a test failed, the test failure was used to constrain further iterations.
4. **Conventional Commits standard:** Commits adhere to standard prefixes (`test(ticket):`, `feat(ticket):`, `fix(ticket):`, `refactor(ticket):`, `docs(ticket):`).

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

### Workflow 2: Solution Exploration (Storage, Concurrency & Data Safety)

When architecting file persistence for `tickets.json`, we evaluated multiple design options:

| Strategy | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **Option A: Direct `fs.writeFile`** | Minimal code, straightforward | High risk of file corruption if process crashes mid-write; no concurrent safety | ❌ Rejected |
| **Option B: Embedded SQLite (`better-sqlite3`)** | ACID transactions, queries | Requires native C++ compilation; adds binary dependencies across OSs | ❌ Rejected |
| **Option C: Naive `copyFile` Fallback** | Avoids rename failures on file locks | **Severe data safety risk:** `copyFile` is non-atomic and truncates destination file; if interrupted, it corrupts existing data | ❌ Rejected |
| **Option D: Fail-Safe Atomic Write (`temp file -> rename`)** | Zero third-party runtime dependencies; crash-resilient; cross-platform atomic swap | Requires temporary file cleanup & fail-safe error propagation | ✅ **Selected** |

**Data Safety Analysis (Why `copyFile` fallback is dangerous):**
- In earlier iterations, an AI draft proposed falling back to `fs.copyFile(tempFile, targetFile)` whenever `fs.rename` failed.
- **Architectural Critique:** `fs.copyFile` is non-atomic. It directly streams into the existing destination file. If power is lost, process crashes, or disk space runs out during the copy, the destination file is left half-written, permanently destroying existing tickets.
- **Fail-Safe Design:** When writing or renaming fails, the storage system must **fail safely**: clean up the temporary file, leave the existing target file completely untouched and intact, and throw a clear `StorageError`.

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

## 3. Real TDD Cycle Evidence: Fail-Safe Atomic Persistence

To demonstrate verified **Red → Green → Refactor** discipline in Git history, we executed a complete TDD cycle addressing storage resilience and I/O error handling.

### Step 1: 🔴 RED Phase — Behavioral Assertion Test
- **Goal:** Write an integration test that simulates an I/O error during atomic rename, asserting that the repository fails safely without corrupting the existing database file.
- **Test Implementation (`tests/integration/json-file-ticket.repository.test.ts`):**
  ```typescript
  it('fails safely and preserves original file data when I/O error occurs during write/rename', async () => {
    const repo = new JsonFileTicketRepository(storagePath);
    await repo.create({ id: 'TICK-001', title: 'Initial Ticket', ... });

    const contentBefore = await fs.readFile(storagePath, 'utf-8');

    // Simulate I/O disk failure during atomic rename
    vi.mocked(fs.rename).mockRejectedValueOnce(new Error('Simulated I/O disk failure on rename'));

    // Assert that operation rejects with StorageError
    await expect(repo.create({ id: 'TICK-002', title: 'Unsafe Ticket', ... })).rejects.toThrow(StorageError);

    // Verify existing storage file remains untouched
    const contentAfter = await fs.readFile(storagePath, 'utf-8');
    expect(contentAfter).toBe(contentBefore);

    // Verify temp files are cleaned up
    const dirFiles = await fs.readdir(path.dirname(storagePath));
    expect(dirFiles.filter(f => f.includes('.tmp.'))).toEqual([]);
  });
  ```
- **Test Failure Output (Assertion Error):**
  ```text
  FAIL  tests/integration/json-file-ticket.repository.test.ts > fails safely and preserves original file data when I/O error occurs during write/rename
  AssertionError: promise resolved "{ id: 'TICK-002', …(7) }" instead of rejecting

  - Expected
  + Received
  - Error { "message": "rejected promise" }
  + { id: 'TICK-002', title: 'Unsafe Ticket', ... }
  ```
  *(Reason: The previous code caught `rename` errors and silently fell back to `copyFile`, resolving the call and modifying the file instead of failing safely!)*
- **Git Commit (RED):** `fd8b3b1` — `test(ticket): add test for fail-safe persistence on storage rename error`

---

### Step 2: 🟢 GREEN Phase — Minimal Fail-Safe Implementation
- **Goal:** Make the test pass with minimal, fail-safe code by removing the unsafe `copyFile` fallback and ensuring temporary files are cleaned up while the target file remains untouched.
- **Code Diff (`src/repositories/json-file-ticket.repository.ts`):**
  ```diff
      try {
        await fs.writeFile(tempFile, content, 'utf-8');
  -     try {
  -       await fs.rename(tempFile, this.filePath);
  -     } catch {
  -       // Fallback for Windows lock issues: copyFile then unlink
  -       await fs.copyFile(tempFile, this.filePath);
  -       await fs.unlink(tempFile);
  -     }
  +     await fs.rename(tempFile, this.filePath);
      } catch (writeErr) {
        try {
          await fs.unlink(tempFile);
        } catch {}
        throw new StorageError(...);
      }
  ```
- **Test Result:**
  ```text
  ✓ tests/unit/ticket.service.test.ts (24 tests)
  ✓ tests/integration/json-file-ticket.repository.test.ts (8 tests)
  ✓ tests/integration/cli.test.ts (10 tests)
  Test Files  3 passed (3)
  Tests       42 passed (42)
  ```
- **Git Commit (GREEN):** `5cff67b` — `fix(ticket): remove unsafe copyFile fallback to ensure fail-safe atomic write`

---

### Step 3: 🔵 REFACTOR Phase — Encapsulation & Separation of Concerns
- **Goal:** Extract atomic write mechanics and cleanup logic into dedicated private methods (`atomicWriteFile`, `safeUnlink`), decoupling the low-level filesystem atomicity contract from JSON serialization logic.
- **Code Structure (`src/repositories/json-file-ticket.repository.ts`):**
  ```typescript
  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore unlink errors during cleanup
    }
  }

  private async atomicWriteFile(targetPath: string, content: string): Promise<void> {
    const tempFile = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    try {
      await fs.writeFile(tempFile, content, 'utf-8');
      await fs.rename(tempFile, targetPath);
    } catch (writeErr) {
      await this.safeUnlink(tempFile);
      throw new StorageError(
        `Failed to write to storage file at "${targetPath}": ${(writeErr as Error).message}`,
        writeErr
      );
    }
  }

  private async writeData(data: StorageData): Promise<void> {
    await this.ensureDirectory();
    data.updatedAt = new Date().toISOString();
    const content = JSON.stringify(data, null, 2);
    await this.atomicWriteFile(this.filePath, content);
  }
  ```
- **Test Verification:**
  - `npm test`: 42/42 tests pass.
  - `npm run typecheck`: 0 TypeScript errors.
- **Git Commit (REFACTOR):** `29a199d` — `refactor(ticket): extract atomicWriteFile and safeUnlink in JsonFileTicketRepository`

---

## 4. Summary of Results

- **Total Test Suites:** 3 (Unit Service, Repository Integration, CLI E2E)
- **Total Passing Tests:** 42 / 42 (100% pass rate)
- **Git Commits & Standards:**
  - `fd8b3b1` `test(ticket): add test for fail-safe persistence on storage rename error`
  - `5cff67b` `fix(ticket): remove unsafe copyFile fallback to ensure fail-safe atomic write`
  - `29a199d` `refactor(ticket): extract atomicWriteFile and safeUnlink in JsonFileTicketRepository`
- **Zero-Dependency Core:** Only `commander` as runtime dependency; native Node `fs/promises` for storage.
- **Deterministic CI/CD Ready:** Fast test runs (average test run ~200ms).
