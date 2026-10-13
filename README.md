# MindX Software Engineer Internship

Repository lưu trữ toàn bộ tài liệu nghiên cứu, ghi chú kỹ thuật và các sản phẩm thực hành trong lộ trình Onboarding / Thực tập Kỹ sư Phần mềm tại MindX.

---

## 📂 Cấu trúc Repository (Repository Structure)

Cấu trúc thư mục hiện tại của repository:

```text
MindX-intern-engineer/
├── README.md                     # Tài liệu tổng quan và mục lục repository
└── Week 1/                       # Tuần 1: TDD & Controlled AI Workflows
    └── research-tdd.md           # Báo cáo nghiên cứu về TDD và quy trình làm việc với AI
```

---

## 📚 Lộ trình & Nội dung chi tiết (Roadmap & Content)

### 🗓️ [Week 1: TDD for CLI Tools & Controlled AI Workflows](./Week%201/research-tdd.md)
Tập trung xây dựng tư duy kỹ thuật (engineering mindset), kỷ luật kiểm thử phần mềm và kỹ năng kiểm soát AI trong lập trình:

- **Nguyên lý TDD (Test-Driven Development):**
  - Vòng đời lặp **Red - Green - Refactor**.
  - Quy tắc biến đổi ưu tiên (Transformation Priority Premise - TPP).
- **Các cấp độ kiểm thử trong công cụ CLI:**
  - So sánh chi tiết Unit Test vs. Integration Test vs. E2E Test theo kim tự tháp kiểm thử.
  - Bộ test cases mẫu cho ứng dụng **Ticket Manager CLI**.
- **Quy trình phối hợp và kiểm soát AI (Controlled AI Workflows):**
  - **Specification-First:** Viết hợp đồng hành vi rõ ràng trước khi yêu cầu AI sinh mã.
  - **Tech Stack Trade-offs:** Phân tích và lựa chọn công nghệ độc lập (Zero-dependency với native `node:test` & `node:assert`).
  - **Iterative Refinement:** Tự phản biện, tái cấu trúc mã (Atomic write, xử lý ngoại lệ I/O trên Windows/POSIX) và tự kiểm chứng độc lập qua tài liệu chính thức mà không phụ thuộc vào AI.

---

## 🛠️ Công nghệ & Công cụ (Tech Stack & Tools)

- **Ngôn ngữ & Nền tảng:** JavaScript / Node.js (ES Modules)
- **Kiểm thử (Testing):** Native `node:test`, `node:assert/strict` (Zero-dependency)
- **Tài liệu:** Markdown (GitHub Flavored Markdown)