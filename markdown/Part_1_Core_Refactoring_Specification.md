# Part 1 — Core Refactoring Specification

> **Nguyên tắc số 1**
- Không suy đoán.
- Không refactor theo cảm tính.
- Mọi nhận xét đều dựa trên code thực tế đã audit.
- Nếu không đủ bằng chứng từ source, ghi rõ: **chưa đủ cơ sở để kết luận**.

---

# Phạm vi

- Core/App.php
- Core/ServiceContainer.php

## Mục tiêu

Không thay đổi hành vi plugin. Chỉ cải thiện kiến trúc và khả năng mở rộng.

---

# 1. Đánh giá tổng thể Core

| Tiêu chí | Điểm |
|----------|------:|
| Khả năng mở rộng | 9.4 |
| Tính tổ chức | 9.6 |
| Khả năng bảo trì | 9.2 |
| SOLID | 8.9 |
| Dependency Management | 8.5 |

## Nhận xét

Core được tổ chức tốt. Điểm cần cải thiện nằm ở việc sử dụng ServiceContainer trên toàn project.

---

# 2. Core/App.php

## Vai trò hiện tại

- Entry point của plugin.
- Bootstrap hệ thống.
- Khởi tạo module.
- Điều phối Container.

## Điểm mạnh

- Một bootstrap duy nhất.
- Không chứa business logic.
- Điều phối module rõ ràng.

## Code smell

**Mức độ:** Medium

### Vấn đề

App vẫn biết khá nhiều dependency cần khởi tạo.

### Refactor

Ưu tiên resolve dependency từ ServiceContainer thay vì khởi tạo trực tiếp khi phù hợp.

### Checklist

- [ ] App chỉ bootstrap.
- [ ] Không thêm business logic.
- [ ] Ưu tiên resolve dependency từ Container.

---

# 3. Core/ServiceContainer.php

## Vai trò hiện tại

- Đăng ký service.
- Resolve dependency.
- Quản lý object.

## Điểm mạnh

- Có DI Container.
- Dependency tập trung.

## Code smell

**Mức độ:** Low

### Vấn đề

Nhiều thành phần khác vẫn dùng `new` hoặc `get_instance()` thay vì resolve từ Container.

### Refactor

Không refactor ServiceContainer.

Refactor nơi sử dụng Container.

### Checklist

- [ ] Controller resolve từ Container.
- [ ] API resolve từ Container.
- [ ] Middleware resolve từ Container.
- [ ] Giảm dần `new` và Singleton.

---

# 4. Kiến trúc hiện tại

Plugin
→ App
→ ServiceContainer
→ Controller
→ Model
→ Viewer

Đây là kiến trúc hợp lý.

---

# 5. Không nên refactor

- Đổi tên App.
- Đổi tên ServiceContainer.
- Thêm Bootstrap class.
- Chia nhỏ App.

Hiện chưa có cơ sở từ code để thực hiện.

---

# 6. Danh sách thay đổi

| File | Thay đổi | Mức độ |
|------|----------|--------|
| Core/App.php | Giảm khởi tạo dependency trực tiếp | Medium |
| Core/ServiceContainer.php | Giữ nguyên implementation | None |
| Các Controller/API | Chuẩn hóa resolve từ Container | High |

---

# 7. Kết luận

Core không phải là điểm yếu của backend.

Điểm cần cải thiện là chuẩn hóa việc sử dụng ServiceContainer trên toàn project.
