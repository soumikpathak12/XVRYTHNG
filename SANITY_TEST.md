# Sanity test – XVRYTHNG

## 1. Backend sanity (tự động)

Backend phải đang chạy (`npm run dev` trong `backend/`).

```bash
cd backend
npm run sanity
```

Chỉ kiểm tra health:

- Đảm bảo `GET /health` trả 200 và `{ "status": "ok" }`.

Để kiểm tra thêm API cần auth (leads, calendar, pm-dashboard), set env rồi chạy lại:

```bash
# Windows PowerShell
$env:SANITY_TEST_EMAIL="admin@company.com"
$env:SANITY_TEST_PASSWORD="yourpassword"
$env:SANITY_TEST_COMPANY_ID="1"
npm run sanity
```

```bash
# Linux/macOS
SANITY_TEST_EMAIL=admin@company.com SANITY_TEST_PASSWORD=yourpassword SANITY_TEST_COMPANY_ID=1 npm run sanity
```

Tùy chọn: `BASE_URL=http://localhost:3000` nếu backend chạy port khác.

---

## 2. Sanity thủ công (checklist)

### Auth & chung

- [ ] Đăng nhập admin/company thành công
- [ ] Đăng nhập employee thành công (nếu có)
- [ ] Đăng xuất hoạt động

### Leads & pipeline

- [ ] Danh sách leads load (Kanban / Table / Calendar)
- [ ] Mở chi tiết 1 lead
- [ ] Tạo lead mới
- [ ] Sửa lead (cập nhật stage, thông tin)
- [ ] Schedule inspection: mở modal → chọn ngày, giờ, inspector → Submit
- [ ] Sau khi schedule, lead hiển thị inspector và ngày inspection đúng

### Employee – Site Inspection

- [ ] Vào **Site Inspection** (sidebar) chỉ thấy view **Calendar** (không Kanban/Table)
- [ ] Calendar chỉ hiện inspection được assign cho employee đó
- [ ] Chuyển Day / Week / Month hoạt động, nút ‹ › lùi/tiến đúng
- [ ] Nút **Edit Template** mở trang template và employee có thể xem/sửa

### Edit template (admin hoặc employee)

- [ ] Mở trang Edit Template
- [ ] Bật section bằng checkbox → section đó được chọn luôn để chỉnh nội dung (1 lần click)
- [ ] Lưu thay đổi template

### PM Dashboard

- [ ] Trang PM Dashboard load, không lỗi
- [ ] **Active Projects (ALL / Retailer / Classic)** hiển thị số đúng
- [ ] **Recent Retailer Projects** và **Recent Classic Projects** có dữ liệu (nếu có)
- [ ] Stage hiển thị dạng đọc được (Pre-approval, Site inspection, …)
- [ ] Upcoming Installations (7 ngày) hiển thị nếu có dữ liệu từ bảng schedule

### Database / migrations

- [ ] Đã chạy migration `011_lead_site_inspections_inspector_id.sql` nếu DB cũ chưa có cột `inspector_id`
- [ ] Đã chạy migration `012_lead_site_inspections_scheduled_at.sql` để lưu thời gian schedule

---

Khi có lỗi: ghi lại bước thao tác, thông báo lỗi (hoặc ảnh), và response API (tab Network) nếu có.
