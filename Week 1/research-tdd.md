# Week 1: TDD for CLI Tools & Controlled AI Workflows

## Overview

Mục tiêu chính của Week 1 là thiết lập tư duy kỹ thuật (engineering mindset) và kỷ luật kiểm thử (testing discipline) cho toàn bộ lộ trình onboarding. Trọng tâm cốt lõi là cách làm việc hiệu quả với AI.

Khi làm việc với AI mà thiếu đi các ràng buộc kỹ thuật rõ ràng,code generate speed luôn nhanh hơn verification speed. Các mô hình LLM thường xuyên tạo ra code trông có vẻ hoàn chỉnh nhưng lại bỏ qua các edge cases, tự ý import các thư viện bên thứ ba không cần thiết, hoặc hallucinate các API không có thật.

Để kiểm soát chất lượng và kiến trúc hệ thống, chúng ta áp dụng Test-Driven Development (TDD). Việc viết test trước giúp xác định rõ ràng input, output và error handling, đồng thời tạo ra một "hàng rào bảo vệ" tự động giúp code do AI sinh ra luôn chuẩn xác, tinh gọn và không bị regression.

## Core Principles of TDD

### Vòng đời Red-Green-Refactor

TDD là phương pháp thiết kế phần mềm loop, nơi hệ thống được phát triển từng bước nhỏ có kiểm chứng:

┌─────────────────────────────────────────────────────────────────┐
│                    RED-GREEN-REFACTOR CYCLE                     │
│                                                                 │
│   1. 🔴 RED      Write a small failing test for 1 behavior.     │
│                  Run it. Verify it fails for the expected reason│
│                  (assertion failure, NOT syntax crash).         │
│                           │                                     │
│                           ▼                                     │
│   2. 🟢 GREEN    Write the minimal code needed to pass.         │
│                  No premature optimization. Keep scope small.   │
│                           │                                     │
│                           ▼                                     │
│   3. 🔵 REFACTOR Clean up duplication, improve naming, optimize.│
│                  All tests must remain green after every edit.  │
│                           │                                     │
│                           └──────── Next behavior ────────►     │
└─────────────────────────────────────────────────────────────────┘



## Testing Levels và ứng dụng trong CLI

### 1. Unit Testing (Domain & Business Rules)
- **Scope:** Kiểm tra các hàm logic và entity thuần túy trong bộ nhớ.
- **Ví dụ trong Ticket CLI:**
  - Validate tiêu đề ticket (bắt buộc, trim khoảng trắng, từ chối chuỗi rỗng).
  - Whitelist các mức độ ưu tiên (`low`, `normal`, `high`, `urgent`).
  - Quản lý trạng thái hợp lệ (`open` -> `in_progress` -> `closed`).
  - Chuẩn hóa mảng tags và logic query lọc ticket.

### 2. Integration Testing (Persistence & Resilience)
- **Scope:** Kiểm tra sự tương tác giữa module lưu trữ và filesystem của hệ điều hành.
- **Ví dụ trong Ticket CLI:**
  - Tự động tạo thư mục cha nếu chưa tồn tại.
  - Xử lý mượt mà khi chạy lần đầu: trả về mảng rỗng `[]` khi file `tickets.json` chưa tồn tại.
  - Bắt lỗi cú pháp khi file JSON bị hỏng (corrupted JSON) và bọc lại thành `StorageError` rõ ràng.
  - Kiểm tra cơ chế **Atomic Write**: ghi ra file tạm (`.tmp`) rồi rename để chống mất dữ liệu khi ứng dụng bị tắt đột ngột.

### 3. End-to-End Testing (trải nghiệm người dùng)
- **Scope:** Khởi chạy toàn bộ tiến trình CLI từ terminal y hệt như người dùng thật.
- **ví dụ trong Ticket CLI:**
  - hiển thị bảng dữ liệu định dạng chuẩn và thông báo thành công.
  - in ra thông báo lỗi thân thiện thay vì ném stack trace khó hiểu.
  - kiểm tra code `0` khi thành công và code `1` khi gặp lỗi validation hoặc tham số sai.

---

## Controlled AI Collaboration

### Rủi ro khi dùng AI không có kiểm soát

Khi đưa cho AI một prompt quá rộng mà không có test ràng buộc, ba vấn đề phổ biến sẽ xuất hiện:
1. **Contextual Drift:** AI tự ý thêm các tính năng không yêu cầu (ví dụ: tự viết thêm tính năng đồng bộ cloud hoặc đổi sang SQLite trong khi đề bài chỉ yêu cầu JSON).
2. **Library Injection:** AI tự import các thư viện nặng cho những tác vụ mà Node.js standard library hoàn toàn tự xử lý được.
3. **Silent Error Omission:** AI chỉ viết "happy path" và bỏ qua việc xử lý ngoại lệ khi đọc/ghi file hoặc parse JSON.

### The 5 Review Questions (Pre-Acceptance Checklist)

Trước khi chấp nhận bất kỳ đoạn code hoặc test nào do AI sinh ra, luôn đối chiếu với 5 câu hỏi cốt lõi:
┌─────────────────────────────────────────────────────────────────┐
│               THE 5 CRITICAL REVIEW QUESTIONS                   │
├───────────────────┬─────────────────────────────────────────────┤
│ 1. Understanding  │ Mình có hiểu tường tận từng dòng code này?  │
│ 2. Alignment      │ Code có bám sát chuẩn Node.js ESM đề ra?    │
│ 3. Assumptions    │ AI đang giả định gì về OS hay đường dẫn?    │
│ 4. Risks          │ Có edge case nào làm crash ứng dụng không?  │
│ 5. Verification   │ Có automated test nào chứng minh nó đúng?   │
└───────────────────┴─────────────────────────────────────────────┘
```

---

## Practical Code & Test Artifacts

Dưới đây là bộ code mẫu hoàn chỉnh cho Ticket Manager CLI, Được generate bởi AI và có qua refined

### 1. Domain Model (`src/models/ticket.js`)

```javascript
import { randomUUID } from 'node:crypto';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const VALID_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'urgent']);
export const VALID_STATUSES = Object.freeze(['open', 'in_progress', 'closed']);

export function createTicket({ title, description = '', priority = 'normal', tags = [] }) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('Ticket title is required');
  }

  const normalizedPriority = String(priority).toLowerCase();
  if (!VALID_PRIORITIES.includes(normalizedPriority)) {
    throw new ValidationError(
      `Invalid priority: ${priority}. Allowed: ${VALID_PRIORITIES.join(', ')}`
    );
  }

  const normalizedTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
    : [];

  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title: title.trim(),
    description: String(description).trim(),
    status: 'open',
    priority: normalizedPriority,
    tags: normalizedTags,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTicketStatus(ticket, newStatus) {
  const normalizedStatus = String(newStatus).toLowerCase();
  if (!VALID_STATUSES.includes(normalizedStatus)) {
    throw new ValidationError(
      `Invalid status: ${newStatus}. Allowed: ${VALID_STATUSES.join(', ')}`
    );
  }

  return {
    ...ticket,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };
}

```

### 2. Unit Test Suite (`test/unit/ticket.test.js`)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTicket,
  updateTicketStatus,
  ValidationError
} from '../../src/models/ticket.js';

describe('Ticket Model (Unit)', () => {
  it('ném ValidationError khi title bị thiếu hoặc chỉ toàn khoảng trắng', () => {
    assert.throws(
      () => createTicket({ title: '   ' }),
      (err) => err instanceof ValidationError && err.message === 'Ticket title is required'
    );
  });

  it('từ chối mức priority không nằm trong danh sách cho phép', () => {
    assert.throws(
      () => createTicket({ title: 'Valid Title', priority: 'emergency' }),
      (err) => err instanceof ValidationError && err.message.includes('Invalid priority')
    );
  });

  it('tạo ticket hợp lệ với title đã trim, status mặc định là open và có UUID', () => {
    const ticket = createTicket({ title: 'Fix auth bug' });
    assert.equal(ticket.title, 'Fix auth bug');
    assert.equal(ticket.status, 'open');
    assert.equal(ticket.priority, 'normal');
    assert.ok(ticket.id && typeof ticket.id === 'string');
    assert.ok(!Number.isNaN(Date.parse(ticket.createdAt)));
  });

  it('cho phép chuyển đổi trạng thái hợp lệ (open -> in_progress -> closed)', () => {
    const ticket = createTicket({ title: 'Task' });
    const inProgress = updateTicketStatus(ticket, 'in_progress');
    assert.equal(inProgress.status, 'in_progress');

    const closed = updateTicketStatus(inProgress, 'closed');
    assert.equal(closed.status, 'closed');
  });
});
```

### 3. Resilient Storage Adapter (`src/storage/json-storage.js`)

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

export class JsonTicketStorage {
  constructor(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new StorageError('Valid file path required');
    }
    this.filePath = path.resolve(filePath);
  }

  async loadAll() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new StorageError('Storage content must be a JSON array');
      }
      return parsed;
    } catch (err) {
      if (err.code === 'ENOENT') return []; // Trả về mảng rỗng an toàn ở lần chạy đầu
      if (err instanceof SyntaxError) {
        throw new StorageError(`Corrupted JSON in ${this.filePath}`, err);
      }
      throw new StorageError(`Read error: ${err.message}`, err);
    }
  }

  async saveAll(tickets) {
    const dir = path.dirname(this.filePath);
    const tempFile = `${this.filePath}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(tempFile, JSON.stringify(tickets, null, 2), 'utf-8');
      await fs.rename(tempFile, this.filePath); // Atomic replacement
    } catch (err) {
      await fs.rm(tempFile, { force: true }).catch(() => {});
      throw new StorageError(`Save failed: ${err.message}`, err);
    }
  }
}
```

## Common mistakes when using AI to generate code & tests

Khi sử dụng AI để hỗ trợ viết code và thiết kế test suite, kỹ sư rất dễ rơi vào "cái bẫy tiện lợi" (convenience trap) do quá tin tưởng vào output của mô hình ngôn ngữ. Dưới đây là phân tích chi tiết về 5 sai lầm phổ biến nhất dưới góc độ lý thuyết kiểm thử và kiến trúc phần mềm:

### 1. Testing Implementation Details (Kiểm thử chi tiết cài đặt thay vì hành vi)
- **lý thuyết:** Sai lầm này xảy ra khi bài test can thiệp quá sâu vào cấu trúc bên trong của module (như kiểm tra các hàm private, biến trạng thái nội bộ, hoặc thứ tự gọi các hàm con) thay vì chỉ quan sát hợp đồng đầu vào và đầu ra công khai (Public API & Observable Behavior).
- **Hậu quả:** Làm cho bộ test trở nên cực kỳ "giòn" (brittle tests). Mỗi khi kỹ sư muốn refactor cấu trúc, dọn dẹp code thừa hoặc tối ưu hiệu năng mà hoàn toàn không làm thay đổi trải nghiệm của người dùng, hàng loạt test vẫn bị fail. Điều này triệt tiêu hoàn toàn lợi ích bảo vệ của TDD trong pha Refactor.
- **khắc phục:** Áp dụng tư duy State Verification đối với public contract: chỉ kiểm tra xem với input X, hệ thống có trả về output Y hoặc làm thay đổi trạng thái persistent Z như mong đợi hay không, hoàn toàn không quan tâm bên trong hàm được tổ chức bằng thuật toán nào.

### 2. Weak Assertions (Kiểm tra lỏng lẻo, tạo cảm giác an toàn giả tạo)
- **lý thuyết:** Các mô hình AI thường có thói quen sinh ra các câu lệnh kiểm tra hời hợt, chỉ xác nhận tính tồn tại chung chung (truthiness) hoặc kiểu dữ liệu cơ bản (ví dụ kiểm tra kết quả trả về có phải là object hay không) thay vì xác thực chính xác cấu trúc dữ liệu và giá trị nghiệp vụ.
- **Hậu quả:** Dẫn đến hiện tượng "xanh ảo" (False Positive). Một đoạn code nghiệp vụ dù bị lỗi nghiêm trọng (chẳng hạn như trả về một object rỗng `{}` hoặc sai lệch toàn bộ nội dung trường dữ liệu) thì bài test vẫn vượt qua (pass). Kỹ sư lầm tưởng hệ thống đã an toàn và đưa code lỗi lên môi trường thực tế.
- **khắc phục:** Sử dụng các assertion so khớp sâu và nghiêm ngặt (Strict Deep Equality). Luôn đối soát toàn bộ cấu trúc dữ liệu, từng trường bắt buộc, kiểu dữ liệu chi tiết và các mã lỗi cụ thể khi có exception xảy ra.

### 3. Over-Mocking the Environment (Lạm dụng Mock môi trường thực tế)
- **lý thuyết:** Để viết test nhanh chóng, AI thường gợi ý mock toàn bộ các module tương tác với hệ điều hành (như file system, stream I/O) bằng các hàm giả lập hoàn toàn trong bộ nhớ.
- **Hậu quả:** Bộ test chạy trong một môi trường giả định hoàn hảo nhưng mất đi tính thực tế. Các vấn đề cốt lõi của hệ thống thực (như quyền truy cập file, khác biệt giữa dấu phân cách đường dẫn trên Windows và Linux, lỗi xung đột file đang mở, hay file bị hỏng cú pháp) đều bị che giấu và chỉ bộc lộ khi người dùng cuối thực sự chạy ứng dụng.
- **khắc phục:** Phân định rõ ràng ranh giới kiểm thử: Unit test kiểm tra logic thuần túy trong bộ nhớ, còn Integration test phải được chạy trực tiếp trên tài nguyên thật (như đọc/ghi file trên thư mục tạm của hệ điều hành) để bắt trọn vẹn các lỗi tích hợp thực tế.

### 4. Blind Trust in AI & Bỏ qua pha RED (Tin tưởng mù quáng vào test do AI sinh ra)
- **lý thuyết:** Kỹ sư copy test do AI tạo ra và chạy thử; khi thấy kết quả hiển thị màu xanh (pass) thì lập tức tin tưởng rằng tính năng đã được kiểm thử đầy đủ.
- **Hậu quả:** AI rất dễ sinh ra các bài test dạng tautology (mệnh đề luôn luôn đúng bất kể mã nguồn ra sao), hoặc các test bất đồng bộ nhưng thiếu cơ chế `await`/`assert`, khiến test runner tự động đánh dấu là thành công dù không có bước kiểm tra nào thực sự chạy.
- **khắc phục:** Tuân thủ tuyệt đối kỷ luật pha RED trong TDD. Một bài test chỉ thực sự có giá trị khi nó được chứng minh là sẽ thất bại (fail) một cách rõ ràng khi thiếu logic nghiệp vụ tương ứng. Tuyệt đối không chấp nhận bất kỳ bài test nào chưa từng trải qua trạng thái đỏ.

### 5. Shared State & Test Inter-dependency (Rò rỉ trạng thái dùng chung giữa các bài test)
- **lý thuyết:** AI thường có xu hướng cấu hình các bài test đọc và ghi chung vào một đường dẫn file cố định trên ổ đĩa thay vì tạo môi trường cô lập riêng biệt cho từng ca kiểm thử.
- **Hậu quả:** Sinh ra hiện tượng "Flaky Tests" (kết quả chập chờn). Các bài test trở nên phụ thuộc vào thứ tự thực thi của nhau: test chạy trước để lại dữ liệu rác làm sai lệch kết quả của test chạy sau, hoặc khi chạy kiểm thử song song (parallel execution) thì xảy ra tranh chấp dữ liệu gây lỗi ngẫu nhiên.
- **khắc phục:** Nguyên tắc độc lập hoàn toàn (Complete Test Isolation). Mỗi bài test phải tự chuẩn bị dữ liệu đầu vào trong một không gian riêng biệt (thư mục tạm độc lập) và có cơ chế dọn dẹp sạch sẽ tài nguyên sau khi hoàn thành.


## Evidence of AI Collaboration Workflows

### Workflow 1: Layered Questioning

Research
Prompt: "Những failure modes phổ biến nhất trong Node.js CLI khi lưu trữ file JSON cục bộ là gì?"
Tóm tắt: Xác định được 3 lỗi chính: thư mục chưa tồn tại (ENOENT), file JSON bị hỏng cú pháp, và lỗi ghi đè dở dang khi bị ngắt tiến trình đột ngột.

Architecture
Prompt: "Tôi đang xây dựng Ticket CLI với các lệnh create/list/show/update. Cần phân lớp kiến trúc thế nào để dễ áp dụng TDD?"
Tóm tắt: Tách thành 4 tầng: CLI args parsing, Service điều phối, Domain Model validation thuần túy, và Storage Adapter.

Code Example
Prompt: "Cho ví dụ test fail bằng node:test để validate title không được rỗng, kèm code tối thiểu để pass."
Tóm tắt: Triển khai kiểm tra ValidationError và logic trim whitespace cho title.

Validation
Prompt: "Nếu quá trình ghi file bị dừng giữa chừng (Ctrl+C), làm sao để tránh hỏng file JSON?"
Tóm tắt: Áp dụng Atomic Write Pattern: ghi toàn bộ dữ liệu ra file .tmp trước, sau đó dùng fs.rename để thay thế file chính thức.

### Workflow 2: Solution Exploration

Vấn đề: Lựa chọn test runner phù hợp cho Ticket Manager CLI.

Các phương án đánh giá:
1. Native `node:test` + `node:assert`: 0 dependencies, khởi động cực nhanh (<40ms), hỗ trợ native ESM.
2. Vitest: Developer experience tốt, nhưng kéo theo ~25MB thư viện npm phụ thuộc.
3. Jest: Phổ biến nhưng cấu hình ESM phức tạp và thời gian khởi động chậm hơn.

Quyết định lựa chọn: Native `node:test`. 
Lý do: Giữ cho CLI hoàn toàn zero-dependency, gọn nhẹ, chạy nhanh và độc lập trên mọi môi trường.

### Workflow 3: Iterative Refinement

1. Code AI gợi ý ban đầu:
Dùng hàm đồng bộ `readFileSync`, gặp race condition với `existsSync`, không bắt lỗi `SyntaxError`.

2. Đánh giá & Phản biện:
Chỉ ra các vấn đề: blocking I/O, lỗi TOCTOU, thiếu cơ chế phục hồi khi JSON hỏng, và rủi ro mất trắng dữ liệu khi write file.

3. Tự refactor code:
Viết lại bằng `fs/promises`, áp dụng atomic write bằng file tạm, và bọc ngoại lệ bằng `StorageError`.

4. Vòng lặp phản hồi với AI:
AI xác nhận giải pháp atomic write đã chuẩn xác, đồng thời lưu ý thêm về hành vi file lock trên Windows (lỗi EPERM khi có tiến trình khác đang scan file).

