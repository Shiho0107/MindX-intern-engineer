# Week 1: TDD for CLI Tools & Controlled AI Workflows

## Overview

Mục tiêu chính của Week 1 là thiết lập tư duy kỹ thuật (engineering mindset) và kỷ luật kiểm thử (testing discipline) cho toàn bộ lộ trình onboarding. Trọng tâm cốt lõi là **cách làm việc hiệu quả với AI**: chuyển dịch từ vị thế người nhận code thụ động sang vai trò **Architect và Driver**.

Khi làm việc với AI mà thiếu đi các ràng buộc kỹ thuật rõ ràng, tốc độ sinh mã (generation speed) luôn vượt xa tốc độ kiểm chứng (verification speed). Các mô hình ngôn ngữ lớn (LLM) thường tạo ra code trông có vẻ hoàn chỉnh nhưng lại bỏ qua các edge cases, tự ý import các thư viện bên thứ ba không cần thiết, hoặc hallucinate các API không có thật.

Để kiểm soát chất lượng và kiến trúc hệ thống, chúng ta áp dụng **Test-Driven Development (TDD)** như một bản hợp đồng hành vi tự động (automated behavioral contract). Việc viết test trước giúp xác định rõ ràng input, output và cơ chế xử lý lỗi. Qua đó, TDD tạo ra một lưới an toàn tự động (safety net) cho các hành vi được bao phủ (covered behaviors), hạn chế tối đa rủi ro regression và ngăn chặn AI sinh mã thừa thãi hoặc sai lệch kiến trúc.

---

## Core Principles of TDD

### Vòng đời Red-Green-Refactor

TDD là phương pháp thiết kế phần mềm lặp, nơi hệ thống được phát triển từng bước nhỏ có kiểm chứng liên tục:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    RED-GREEN-REFACTOR CYCLE                     │
│                                                                 │
│   1. 🔴 RED      Viết một test nhỏ cho MỘT behavior cụ thể.     │
│                  Chạy test. Bắt buộc phải FAIL vì đúng lý do    │
│                  (assertion failure, KHÔNG PHẢI lỗi cú pháp).   │
│                           │                                     │
│                           ▼                                     │
│   2. 🟢 GREEN    Viết code TỐI THIỂU để test vượt qua.          │
│                  Không over-engineer. Giữ scope code nhỏ nhất.  │
│                           │                                     │
│                           ▼                                     │
│   3. 🔵 REFACTOR Tối ưu code, xóa trùng lặp, chuẩn hóa logic.   │
│                  Tất cả test PHẢI giữ màu xanh sau mỗi lần sửa. │
│                           │                                     │
│                           └──────── Behavior tiếp theo ───►     │
└─────────────────────────────────────────────────────────────────┘
```

1. **🔴 RED (Fail First):** Viết test đặc tả hành vi mong đợi trước khi viết mã triển khai. Bắt buộc phải chạy test và thấy test thất bại do chưa có logic (assertion error), chứ không phải do lỗi biên dịch hay sai đường dẫn import.
2. **🟢 GREEN (Minimal Code):** Viết lượng mã nguồn tối thiểu để test chuyển sang màu xanh. Không suy diễn tính năng tương lai hay tối ưu sớm ở bước này.
3. **🔵 REFACTOR (Clean Up):** Tinh chỉnh cấu trúc code, loại bỏ trùng lặp, cải thiện tên biến trong khi toàn bộ test suite vẫn đảm bảo pass 100%.

---

## Testing Levels và Ứng Dụng Trong CLI

### 1. Bảng So Sánh Các Cấp Độ Kiểm Thử (Unit vs. Integration vs. E2E)

Để xây dựng một chiến lược kiểm thử cân bằng, cần phân định rõ mục đích, chi phí và phạm vi của từng cấp độ kiểm thử theo mô hình Kim tự tháp kiểm thử (Testing Pyramid):

| Cấp độ (Test Level)       | Phạm vi kiểm thử (Scope)                                                       | Ưu điểm cốt lõi                                                                | Nhược điểm / Rủi ro                                                             | Tốc độ & Chi phí bảo trì                                    | Khi nào nên áp dụng?                                                                         |
| :------------------------ | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Unit Test**             | Từng hàm, class, hoặc entity logic độc lập trong bộ nhớ.                       | Thực thi cực nhanh, xác định chính xác vị trí lỗi, dễ cô lập logic.            | Không phát hiện được lỗi khi các module ghép nối với nhau hoặc lỗi I/O thực tế. | **Tốc độ:** <5ms / test.<br>**Chi phí:** Rất thấp.       | Kiểm tra validation rules, tính toán dữ liệu, state transitions, business logic.             |
| **Integration Test**      | Sự tương tác giữa 2 hay nhiều module (vd: Model -> Filesystem). | Đảm bảo các thành phần phối hợp chuẩn xác với tài nguyên bên ngoài (file, DB). | Chậm hơn unit test, cần chuẩn bị và dọn dẹp môi trường (setup/teardown).        | **Tốc độ:** 10 - 50ms / test.<br>**Chi phí:** Trung bình. | Kiểm tra storage adapter đọc/ghi file `tickets.json`, tạo thư mục, phục hồi file corrupt.    |
| **End-to-End (E2E) Test** | Toàn bộ ứng dụng từ đầu vào terminal của người dùng đến kết quả cuối cùng.     | Độ tin cậy cao nhất vì chạy đúng môi trường và luồng thực tế của người dùng.   | Chậm nhất, khó debug khi fail, dễ bị flaky nếu môi trường không ổn định.        | **Tốc độ:** 100 - 300ms / test.<br>**Chi phí:** Cao nhất. | Kiểm tra CLI argument parsing, cờ dòng lệnh (`--help`), định dạng stdout/stderr, exit codes. |

---

### 2. Test Cases Cho Ticket Manager CLI

Dưới đây là các kịch bản kiểm thử (test cases) theo định dạng **Input -> Expected Behavior -> Test Level** cho các lệnh cốt lõi của Ticket Manager CLI:

| Nhóm chức năng              | Input / Thao tác CLI                                         | Hành vi mong đợi (Expected Output & Side Effect)                                    | Exit Code | Cấp độ kiểm thử (Test Level) |
| :-------------------------- | :----------------------------------------------------------- | :---------------------------------------------------------------------------------- | :-------- | :--------------------------- |
| **Validation**              | `createTicket({ title: "   " })`                             | Ném `ValidationError: Ticket title is required`. Không tạo ticket.                  | N/A       | **Unit Test**                |
| **Validation**              | `createTicket({ title: "Bug", priority: "super" })`          | Ném `ValidationError: Invalid priority`. Chỉ chấp nhận: low, normal, high, urgent.  | N/A       | **Unit Test**                |
| **State Machine**           | `updateTicketStatus(closedTicket, "open")`                   | Ném `ValidationError: Cannot transition from 'closed' to 'open'`.                   | N/A       | **Unit Test**                |
| **Storage (First Run)**     | Gọi `storage.loadAll()` khi file `tickets.json` chưa tồn tại | Trả về mảng rỗng `[]`, không crash tiến trình với lỗi `ENOENT`.                     | N/A       | **Integration Test**         |
| **Storage (Persistence)**   | Gọi `storage.saveAll([ticket])` rồi gọi `storage.loadAll()`  | Dữ liệu đọc ra khớp hoàn toàn với dữ liệu vừa lưu; file ghi atomic dạng JSON chuẩn. | N/A       | **Integration Test**         |
| **Storage (Corrupted)**     | File `tickets.json` chứa nội dung lỗi cú pháp `{ bad json`   | Bắt lỗi `SyntaxError` và ném `StorageError: Corrupted storage file`.                | N/A       | **Integration Test**         |
| **CLI: `create` (Success)** | `node bin/cli.js create --title "Fix login" --priority high` | In ra thông báo tạo thành công kèm ID ticket vào `stdout`; lưu vào file JSON.       | `0`       | **E2E Test**                 |
| **CLI: `create` (Failure)** | `node bin/cli.js create` (thiếu cờ `--title`)                | In ra thông báo lỗi dễ hiểu vào `stderr`: _"Error: Ticket title is required"_.      | `1`       | **E2E Test**                 |
| **CLI: `list` (Filtered)**  | `node bin/cli.js list --status open --priority high`         | In bảng danh sách chỉ chứa các ticket thỏa mãn đồng thời 2 điều kiện lọc.           | `0`       | **E2E Test**                 |
| **CLI: `show` (Not Found)** | `node bin/cli.js show 99999` (ID không tồn tại)              | In ra `stderr`: _"Error: Ticket with ID '99999' not found"_.                        | `1`       | **E2E Test**                 |
| **CLI: `update` (Invalid)** | `node bin/cli.js update <id> --status invalid_status`        | In ra `stderr`: lỗi validation trạng thái; không thay đổi dữ liệu trong file.       | `1`       | **E2E Test**                 |

---

## Controlled AI Collaboration

### Rủi ro khi cộng tác với AI không có kiểm soát

Khi đưa cho AI một prompt quá rộng mà không có test ràng buộc, ba vấn đề phổ biến sẽ xuất hiện:

1. **Contextual Drift:** AI tự ý thêm các tính năng không yêu cầu (ví dụ: tự viết thêm tính năng đồng bộ cloud hoặc chuyển sang SQLite trong khi đề bài chỉ yêu cầu lưu file JSON).
2. **Library Injection:** AI tự import các thư viện bên ngoài (`chalk`, `commander`, `lodash`) cho những tác vụ mà thư viện chuẩn của Node.js hoàn toàn tự xử lý được.
3. **Silent Error Omission:** AI chỉ viết "happy path" và bỏ qua việc xử lý ngoại lệ khi đọc/ghi file hoặc parse JSON.

### The 5 Review Questions (Pre-Acceptance Checklist)

Trước khi chấp nhận bất kỳ đoạn code hoặc test nào do AI sinh ra, luôn đối chiếu với 5 câu hỏi cốt lõi:

```text
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

## Practical Code & Test Artifacts (Reference Snippets)

> **Lưu ý:** Các đoạn mã dưới đây là **code mẫu tham chiếu (reference snippets)** phục vụ nghiên cứu kiến trúc và thử nghiệm TDD ở tuần 1, không phải là ứng dụng CLI hoàn chỉnh.

### 1. Domain Model & State Transition Rules (`src/models/ticket.js`)

Mô hình Domain quản lý chặt chẽ quy tắc tạo ticket và **máy trạng thái (State Machine)** để kiểm soát việc chuyển đổi trạng thái hợp lệ:

```javascript
import { randomUUID } from "node:crypto";

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export const VALID_PRIORITIES = Object.freeze([
  "low",
  "normal",
  "high",
  "urgent",
]);
export const VALID_STATUSES = Object.freeze(["open", "in_progress", "closed"]);

// Quy tắc chuyển đổi trạng thái nghiêm ngặt (State Transition Rules)
export const ALLOWED_TRANSITIONS = Object.freeze({
  open: ["in_progress", "closed"],
  in_progress: ["open", "closed"],
  closed: [], // Ticket đã closed thì không thể tự do mở lại nếu không có quy trình re-open riêng
});

export function createTicket({
  title,
  description = "",
  priority = "normal",
  tags = [],
}) {
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new ValidationError("Ticket title is required");
  }

  const normalizedPriority = String(priority).toLowerCase();
  if (!VALID_PRIORITIES.includes(normalizedPriority)) {
    throw new ValidationError(
      `Invalid priority: ${priority}. Allowed: ${VALID_PRIORITIES.join(", ")}`,
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
    status: "open",
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
      `Invalid status: ${newStatus}. Allowed: ${VALID_STATUSES.join(", ")}`,
    );
  }

  // Kiểm tra tính hợp lệ của bước chuyển trạng thái (State Machine validation)
  const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
  if (!allowed.includes(normalizedStatus)) {
    throw new ValidationError(
      `Cannot transition ticket status from '${ticket.status}' to '${normalizedStatus}'`,
    );
  }

  return {
    ...ticket,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };
}
```

---

### 2. Unit Test Suite (`test/unit/ticket.test.js`)

Bộ unit test kiểm thử cả happy path lẫn các trường hợp biên và chuyển đổi trạng thái phi lý (negative tests):

```javascript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTicket,
  updateTicketStatus,
  ValidationError,
} from "../../src/models/ticket.js";

describe("Ticket Model (Unit)", () => {
  it("ném ValidationError khi title bị thiếu hoặc chỉ toàn khoảng trắng", () => {
    assert.throws(
      () => createTicket({ title: "   " }),
      (err) =>
        err instanceof ValidationError &&
        err.message === "Ticket title is required",
    );
  });

  it("từ chối mức priority không nằm trong danh sách cho phép", () => {
    assert.throws(
      () => createTicket({ title: "Valid Title", priority: "emergency" }),
      (err) =>
        err instanceof ValidationError &&
        err.message.includes("Invalid priority"),
    );
  });

  it("tạo ticket hợp lệ với title đã trim, status mặc định là open và có UUID", () => {
    const ticket = createTicket({ title: "Fix auth bug" });
    assert.equal(ticket.title, "Fix auth bug");
    assert.equal(ticket.status, "open");
    assert.equal(ticket.priority, "normal");
    assert.ok(ticket.id && typeof ticket.id === "string");
    assert.ok(!Number.isNaN(Date.parse(ticket.createdAt)));
  });

  it("cho phép chuyển đổi trạng thái hợp lệ theo quy trình (open -> in_progress -> closed)", () => {
    const ticket = createTicket({ title: "Task" });
    const inProgress = updateTicketStatus(ticket, "in_progress");
    assert.equal(inProgress.status, "in_progress");

    const closed = updateTicketStatus(inProgress, "closed");
    assert.equal(closed.status, "closed");
  });

  it("từ chối bước chuyển trạng thái không hợp lệ (ví dụ: closed -> open)", () => {
    const ticket = createTicket({ title: "Task" });
    const closed = updateTicketStatus(ticket, "closed");

    // Negative case: Closed ticket không được phép chuyển ngược về open
    assert.throws(
      () => updateTicketStatus(closed, "open"),
      (err) =>
        err instanceof ValidationError &&
        err.message.includes(
          "Cannot transition ticket status from 'closed' to 'open'",
        ),
    );
  });
});
```

---

### 3. Resilient Storage Adapter với Atomic Write (`src/storage/json-storage.js`)

Module lưu trữ áp dụng **Atomic Write Pattern**: ghi toàn bộ nội dung ra file tạm trước rồi mới thực hiện `fs.rename` để tránh hiện tượng mất dữ liệu (0-byte file) khi tiến trình bị ngắt đột ngột:

```javascript
import fs from "node:fs/promises";
import path from "node:path";

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "StorageError";
    this.cause = cause;
  }
}

export class JsonTicketStorage {
  constructor(filePath) {
    if (!filePath || typeof filePath !== "string") {
      throw new StorageError("Valid file path required");
    }
    this.filePath = path.resolve(filePath);
  }

  async loadAll() {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new StorageError("Storage content must be a JSON array");
      }
      return parsed;
    } catch (err) {
      if (err.code === "ENOENT") return []; // Trả về mảng rỗng an toàn ở lần chạy đầu
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
      await fs.writeFile(tempFile, JSON.stringify(tickets, null, 2), "utf-8");
      await fs.rename(tempFile, this.filePath); // Atomic replacement
    } catch (err) {
      await fs.rm(tempFile, { force: true }).catch(() => {});
      throw new StorageError(`Save failed: ${err.message}`, err);
    }
  }
}
```

---

## Common Mistakes When Using AI to Generate Code & Tests

Khi sử dụng AI để hỗ trợ viết code và thiết kế test suite, kỹ sư rất dễ rơi vào "cái bẫy tiện lợi" (convenience trap) do quá tin tưởng vào output của mô hình ngôn ngữ. Dưới đây là phân tích chi tiết về 6 sai lầm phổ biến nhất:

### 1. Testing Implementation Details (Kiểm thử chi tiết cài đặt thay vì hành vi)

- **Lý thuyết:** Xảy ra khi bài test can thiệp quá sâu vào cấu trúc bên trong của module (như kiểm tra các hàm private, biến trạng thái ngầm, hoặc thứ tự gọi các hàm con) thay vì chỉ quan sát hợp đồng đầu vào và đầu ra công khai (Public API & Observable Behavior).
- **Hậu quả:** Làm cho bộ test trở nên cực kỳ "giòn" (brittle tests). Mỗi khi kỹ sư muốn refactor cấu trúc, dọn dẹp code thừa hoặc tối ưu hiệu năng mà hoàn toàn không làm thay đổi hành vi đối với người dùng, hàng loạt test vẫn bị fail. Điều này triệt tiêu hoàn toàn lợi ích bảo vệ của TDD trong pha Refactor.
- **Cách khắc phục:** Áp dụng tư duy State Verification đối với public contract: chỉ kiểm tra xem với input X, hệ thống có trả về output Y hoặc làm thay đổi trạng thái persistent Z như mong đợi hay không, hoàn toàn không quan tâm bên trong hàm được tổ chức bằng thuật toán nào.

### 2. Weak Assertions (Kiểm tra lỏng lẻo, tạo cảm giác an toàn giả tạo)

- **Lý thuyết:** Các mô hình AI thường có thói quen sinh ra các câu lệnh kiểm tra hời hợt, chỉ xác nhận tính tồn tại chung chung (truthiness) hoặc kiểu dữ liệu cơ bản (ví dụ kiểm tra kết quả trả về có phải là object hay không) thay vì xác thực chính xác cấu trúc dữ liệu và giá trị nghiệp vụ.
- **Hậu quả:** Dẫn đến hiện tượng "xanh ảo" (False Positive). Một đoạn code nghiệp vụ dù bị lỗi nghiêm trọng (chẳng hạn như trả về một object rỗng `{}` hoặc sai lệch toàn bộ nội dung trường dữ liệu) thì bài test vẫn vượt qua (pass). Kỹ sư lầm tưởng hệ thống đã an toàn và đưa code lỗi lên môi trường thực tế.
- **Cách khắc phục:** Sử dụng các assertion so khớp sâu và nghiêm ngặt (Strict Deep Equality). Luôn đối soát toàn bộ cấu trúc dữ liệu, từng trường bắt buộc, kiểu dữ liệu chi tiết và các mã lỗi cụ thể khi có exception xảy ra.

### 3. Over-Testing (Kiểm thử quá mức, lãng phí tài nguyên bảo trì)

- **Lý thuyết:** Xuất hiện khi kỹ sư để AI sinh test tràn lan cho mọi dòng code mà không cân nhắc giá trị thực tế. Điển hình là: test lại các hàm getter/setter tầm thường, viết hàng chục test case lặp đi lặp lại chỉ để kiểm tra cùng một nhánh logic, hoặc test cả những tính năng vốn đã được thư viện chuẩn của ngôn ngữ đảm bảo (như test xem `Array.prototype.push` có hoạt động đúng không).
- **Hậu quả:** Làm tăng đột biến chi phí bảo trì (maintenance burden). Test suite chạy chậm chạp, và mỗi khi có một thay đổi nhỏ về yêu cầu nghiệp vụ, kỹ sư phải tốn hàng giờ đồng hồ để sửa hàng loạt test trùng lặp mà không mang lại thêm bất kỳ giá trị bảo vệ chất lượng nào.
- **Cách khắc phục:** Áp dụng nguyên lý kiểm thử theo rủi ro (Risk-Based Testing). Chỉ tập trung viết test cho các logic nghiệp vụ quan trọng, các điều kiện biên (edge cases), các luồng xử lý lỗi phức tạp và các giao tiếp giữa các module. Không test lại các chức năng cơ bản của ngôn ngữ hay framework.

### 4. Over-Mocking the Environment (Lạm dụng Mock môi trường thực tế)

- **Lý thuyết:** Để viết test nhanh chóng, AI thường gợi ý mock toàn bộ các module tương tác với hệ điều hành (như file system, stream I/O) bằng các hàm giả lập hoàn toàn trong bộ nhớ.
- **Hậu quả:** Bộ test chạy trong một môi trường giả định hoàn hảo nhưng mất đi tính thực tế. Các vấn đề cốt lõi của hệ thống thực (như quyền truy cập file `EACCES`, khác biệt giữa dấu phân cách đường dẫn trên Windows `\` và Linux `/`, lỗi xung đột file đang mở, hay file bị hỏng cú pháp) đều bị che giấu và chỉ bộc lộ khi người dùng cuối thực sự chạy ứng dụng.
- **Cách khắc phục:** Phân định rõ ràng ranh giới kiểm thử: Unit test kiểm tra logic thuần túy trong bộ nhớ, còn Integration test phải được chạy trực tiếp trên tài nguyên thật (như đọc/ghi file trên thư mục tạm của hệ điều hành) để bắt trọn vẹn các lỗi tích hợp thực tế.

### 5. Blind Trust in AI & Bỏ qua pha RED (Tin tưởng mù quáng vào test do AI sinh ra)

- **Lý thuyết:** Kỹ sư copy test do AI tạo ra và chạy thử; khi thấy kết quả hiển thị màu xanh (pass) thì lập tức tin tưởng rằng tính năng đã được kiểm thử đầy đủ.
- **Hậu quả:** AI rất dễ sinh ra các bài test dạng tautology (mệnh đề luôn luôn đúng bất kể mã nguồn ra sao), hoặc các test bất đồng bộ nhưng thiếu cơ chế `await`/`assert`, khiến test runner tự động đánh dấu là thành công dù không có bước kiểm tra nào thực sự chạy.
- **Cách khắc phục:** Tuân thủ tuyệt đối kỷ luật pha RED trong TDD. Một bài test chỉ thực sự có giá trị khi nó được chứng minh là sẽ thất bại (fail) một cách rõ ràng khi thiếu logic nghiệp vụ tương ứng. Tuyệt đối không chấp nhận bất kỳ bài test nào chưa từng trải qua trạng thái đỏ.

### 6. Shared State & Test Inter-dependency (Rò rỉ trạng thái dùng chung giữa các bài test)

- **Lý thuyết:** AI thường có xu hướng cấu hình các bài test đọc và ghi chung vào một đường dẫn file cố định trên ổ đĩa thay vì tạo môi trường cô lập riêng biệt cho từng ca kiểm thử.
- **Hậu quả:** Sinh ra hiện tượng "Flaky Tests" (kết quả chập chờn). Các bài test trở nên phụ thuộc vào thứ tự thực thi của nhau: test chạy trước để lại dữ liệu rác làm sai lệch kết quả của test chạy sau, hoặc khi chạy kiểm thử song song (parallel execution) thì xảy ra tranh chấp dữ liệu gây lỗi ngẫu nhiên.
- **Cách khắc phục:** Nguyên tắc độc lập hoàn toàn (Complete Test Isolation). Mỗi bài test phải tự chuẩn bị dữ liệu đầu vào trong một không gian riêng biệt (thư mục tạm độc lập `os.tmpdir()`) và có cơ chế dọn dẹp sạch sẽ tài nguyên sau khi hoàn thành.

---

## Evidence of AI Collaboration Workflows

Dưới đây là tài liệu minh chứng cho việc thực hành 3 quy trình cộng tác với AI, thể hiện rõ chu trình: **Prompt -> AI phản hồi -> Kỹ sư phản biện/sửa đổi -> Tự kiểm chứng độc lập -> Đúc kết bài học**.

---

### Workflow 1: Layered Questioning (TDD Cho CLI Storage)

Áp dụng phương pháp phân tầng câu hỏi để học hỏi và thiết kế từng bước thay vì yêu cầu AI sinh mã nguồn một lần:

- **Tầng 1 (Research - Nghiên cứu nguyên lý):**
  - _Prompt:_ "Những failure modes phổ biến nhất trong Node.js CLI khi lưu trữ file JSON cục bộ là gì?"
  - _Tóm tắt tiếp nhận:_ Xác định được 3 rủi ro chính: thiếu thư mục chứa (`ENOENT`), lỗi cú pháp khi file bị sửa tay (`SyntaxError`), và lỗi ghi dở dang khi người dùng bấm `Ctrl+C`.
- **Tầng 2 (Architecture - Định hình kiến trúc):**
  - _Prompt:_ "Tôi đang xây dựng Ticket CLI với các lệnh create, list, show, update. Cần phân lớp kiến trúc thế nào để dễ áp dụng TDD mà không phải mock quá nhiều?"
  - _Tóm tắt tiếp nhận:_ Tách làm 4 lớp rõ ràng: Interface (CLI argument parsing) $\to$ Service (điều phối nghiệp vụ) $\to$ Domain Model (pure validation in-memory) $\to$ Storage Adapter (file persistence).
- **Tầng 3 (Code Example - Đặc tả mã nguồn mẫu):**
  - _Prompt:_ "Cho ví dụ test fail bằng node:test để validate title không được rỗng, kèm code tối thiểu để pass."
  - _Tóm tắt tiếp nhận:_ Tiếp nhận pattern viết assertion với custom error `ValidationError` và logic trim chuỗi đầu vào.
- **Tầng 4 (Validation - Thử thách rủi ro biên):**
  - _Prompt:_ "Nếu quá trình ghi file bị dừng giữa chừng (Ctrl+C), làm sao để tránh hỏng file JSON?"
  - _Tóm tắt tiếp nhận:_ Tiếp nhận mẫu thiết kế **Atomic Write**: ghi ra file tạm `.tmp` trước, sau đó dùng `fs.rename` để ghi đè nguyên tử.

---

### Workflow 2: Solution Exploration (Lựa Chọn Test Runner)

**Bài toán:** Lựa chọn test runner phù hợp cho Ticket Manager CLI ở Tuần 2.

**Tiêu chí đánh giá:** Tốc độ khởi động, số lượng thư viện phụ thuộc cài thêm (dependency footprint), khả năng hỗ trợ native ES Modules, và tính di động trên môi trường đánh giá.

| Phương án đánh giá                                  | Ưu điểm cốt lõi                                                                                                              | Nhược điểm / Rủi ro                                                                                              | Cơ sở đo lường & Nguồn tham khảo                                                                                                                                  |
| :-------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phương án A: Native `node:test` + `node:assert`** | **0 dependencies** cài thêm. Tích hợp sẵn trong Node.js. Hỗ trợ native ESM không cần transpile. Khởi động tức thì ($<40$ms). | Bộ công cụ mock tích hợp ở mức cơ bản, ít plugin mở rộng hơn Jest.                                               | Tài liệu chính thức Node.js: [Node.js Test Runner Documentation](https://nodejs.org/api/test.html). Đo đạc thời gian chạy tiến trình qua lệnh `time node --test`. |
| **Phương án B: Vitest**                             | Giao diện dòng lệnh đẹp, watch mode cực nhanh, hệ sinh thái tương thích tốt với ESM và Vite.                                 | Kéo theo khoảng $\approx 20-25$MB thư viện phụ thuộc vào `node_modules`.                                         | Kiểm tra kích thước package qua npm registry (`npm info vitest dist.unpackedSize`).                                                                               |
| **Phương án C: Jest**                               | Hệ sinh thái khổng lồ, tài liệu dồi dào, chuẩn công nghiệp lâu đời.                                                          | Cấu hình native ESM phức tạp (yêu cầu cờ `--experimental-vm-modules`), thời gian khởi động chậm do overhead lớn. | Tài liệu Jest ESM: [Jest ECMAScript Modules](https://jestjs.io/docs/ecmascript-modules).                                                                          |

**Quyết định lựa chọn:** Chọn **Native `node:test` và `node:assert/strict`**.  
_Lý do:_ Đối với một công cụ CLI nhẹ nhàng, việc đạt trạng thái **Zero Dependencies** là ưu tiên hàng đầu, giúp project dễ cài đặt, không lo lỗi xung đột phiên bản `node_modules` và khởi động nhanh nhất.

---

### Workflow 3: Iterative Refinement

Dưới đây là minh chứng chi tiết cho chu trình kiểm chứng độc lập, không dựa vào việc "hỏi lại AI":

#### Bước 1: Prompt ban đầu & Code do AI sinh ra (Có lỗi tiềm ẩn)

_Prompt của kỹ sư:_ "Hãy viết hàm đọc và ghi danh sách ticket vào file JSON cho CLI tool."

AI sinh ra đoạn code sau:

```javascript
// AI initial draft
const fs = require("fs");

function loadTickets(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return [];
}

function saveTickets(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data));
}
```

#### Bước 2: Phát hiện vấn đề

Sau khi đọc và phân tích đoạn code trên, nhận thấy 4 vấn đề kỹ thuật nghiêm trọng:

1. **Blocking I/O:** Sử dụng `readFileSync` và `writeFileSync` đồng bộ, làm nghẽn Event Loop của Node.js.
2. **Race condition (TOCTOU):** `fs.existsSync` kiểm tra file có tồn tại, nhưng file có thể bị xóa ngay trước khi gọi `fs.readFileSync`.
3. **Crash khi JSON hỏng:** Nếu file `filePath` bị hỏng cú pháp, `JSON.parse` sẽ ném ngoại lệ chưa được bắt (`SyntaxError`), làm crash toàn bộ CLI.
4. **Nguy cơ mất trắng dữ liệu:** `fs.writeFileSync` sẽ xóa sạch nội dung file cũ ngay khi mở file để ghi. Nếu tiến trình bị tắt đột ngột lúc đang ghi (mất điện, kill process), file sẽ còn 0 byte và toàn bộ dữ liệu bị mất vĩnh viễn.

#### Bước 3: Tự refactor mã nguồn

Tự viết lại module lưu trữ, áp dụng `fs/promises`, bắt lỗi có chủ đích và áp dụng cơ chế Atomic Write:

```javascript
import fs from "node:fs/promises";
import path from "node:path";

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "StorageError";
    this.cause = cause;
  }
}

export class JsonTicketStorage {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
  }

  async loadAll() {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") return []; // Xử lý êm thuận khi chưa có file
      if (err instanceof SyntaxError) {
        throw new StorageError(
          `Corrupted JSON storage at ${this.filePath}`,
          err,
        );
      }
      throw new StorageError(`Read failure: ${err.message}`, err);
    }
  }

  async saveAll(tickets) {
    const tempFile = `${this.filePath}.${Date.now()}.tmp`;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(tempFile, JSON.stringify(tickets, null, 2), "utf-8");
      await fs.rename(tempFile, this.filePath); // Thay thế nguyên tử
    } catch (err) {
      await fs.rm(tempFile, { force: true }).catch(() => {});
      throw new StorageError(`Save failure: ${err.message}`, err);
    }
  }
}
```

#### Bước 4: Tự kiểm chứng độc lập (Independent Verification - Không phụ thuộc AI)

Thay vì đưa code cho AI hỏi "code này chuẩn chưa?", tiến hành hai bước kiểm chứng độc lập:

1. **Kiểm chứng bằng automated test suite thực tế:**
   - Tạo file test tích hợp trong thư mục tạm: cố tình ghi chuỗi JSON hỏng `{"invalid: [` vào file test.
   - Chạy lệnh test thực tế:

     ```bash
     node --test test/integration/storage.test.js
     ```

   - Kết quả: Test bắt đúng `StorageError` với thông điệp _"Corrupted JSON storage"_, chứng minh cơ chế phục hồi lỗi hoạt động chính xác.
2. **Kiểm chứng qua tài liệu kỹ thuật chính thống (Official Documentation):**
   - Tra cứu tài liệu [Node.js File System Documentation: fsPromises.rename](https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath):
   - _Phát hiện kỹ thuật:_ Thao tác `rename` là nguyên tử (atomic) trên các hệ điều hành họ POSIX (Linux, macOS). Tuy nhiên, trên hệ điều hành **Windows**, nếu file đích đang bị một tiến trình khác (như chương trình antivirus, trình soạn thảo text) mở và giữ handle, `fs.rename` sẽ ném mã lỗi `EPERM` hoặc `EBUSY`.
   - _Kết luận & giải pháp:_ Để ứng dụng chạy bền vững trên Windows, tầng lưu trữ cần bọc thêm cơ chế retry ngắn hoặc thông báo lỗi rõ ràng yêu cầu người dùng đóng các ứng dụng đang mở file.

---

## Tài Liệu Tham Khảo (References)

1. **Kent Beck**, _Test-Driven Development: By Example_, Addison-Wesley Professional, 2002.
2. **Robert C. Martin (Uncle Bob)**, _The Transformation Priority Premise_, 2013. [Link bài viết](https://blog.cleancoder.com/uncle-bob/2013/05/27/TheTransformationPriorityPremise.html)
3. **Node.js Official Documentation**:
   - [Node.js Test Runner API (`node:test`)](https://nodejs.org/api/test.html)
   - [Node.js Strict Assertion Testing (`node:assert/strict`)](https://nodejs.org/api/assert.html)
   - [Node.js File System Promises API (`node:fs/promises`)](https://nodejs.org/api/fs.html#promises-api)
4. **Martin Fowler**:
   - [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
   - [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
