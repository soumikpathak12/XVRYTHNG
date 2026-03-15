# Xem trước thay đổi – Thông báo Success/Error (Toast)

Bạn có thể so sánh **trước** và **sau** rồi quyết định giữ hay revert.

---

## 1. LeadDetailPage.jsx – Form chỉnh sửa lead (tab Details)

### TRƯỚC
- Gửi form **Save** → gọi `updateLead()` + `loadLead()`.
- **Thành công:** không có thông báo, chỉ thấy dữ liệu refresh.
- **Lỗi:** exception không được catch → có thể chỉ lỗi console, người dùng không thấy gì trên UI.

### SAU
- **Thành công:** hiện dải thông báo màu xanh **"Lead updated successfully"** (tự tắt sau 3 giây).
- **Lỗi:** hiện dải thông báo màu đỏ với nội dung lỗi (tự tắt sau 4 giây).
- Vị trí: ngay dưới header, trên phần "Referred by" / nội dung chính.

**Đoạn code thêm/sửa:**
- State: `const [toast, setToast] = useState({ text: '', type: 'success' });`
- `handleDetailsSubmit`: bọc trong `try/catch`, gọi `setToast({ text: '...', type: 'success'|'error' })` và `setTimeout` để xóa toast.
- Trong JSX: thêm một block hiển thị toast (dùng class `lead-detail-toast`, `lead-detail-toast-success`; lỗi dùng style inline đỏ).

---

## 2. ImportLeadsModal.jsx – Import CSV

### TRƯỚC
- Lỗi parse CSV / không có dòng hợp lệ / lỗi API → dùng **`alert(...)`**.
- Thành công: gọi `onSuccess()` (chỉ refresh list), không có thông báo chữ trên trang.

### SAU
- Thêm prop **`onError`** (tùy chọn). Khi có lỗi: gọi `onError(message)` nếu có, không thì fallback `alert(...)`.
- **`onSuccess`** giờ nhận tham số **`(result)`** (object `{ imported, failed, errors }`) để parent có thể hiển thị "Imported N leads".

**Đoạn code thay đổi:**
- Signature: `ImportLeadsModal({ onClose, onSuccess, onError })`
- Parse CSV lỗi: `if (onError) onError('...'); else alert(...);`
- "No valid rows": `if (onError) onError('...'); else alert(...);`
- Sau khi gọi API import: `onSuccess(resp.data)` thay vì `onSuccess()`; trong catch: `if (onError) onError(err?.message); else alert(...);`

---

## 3. LeadsPage.jsx – Trang danh sách leads (dùng ImportLeadsModal)

### TRƯỚC
- `<ImportLeadsModal onSuccess={() => setRefreshTrigger(...)} />` – không truyền `onError`.
- Toast chỉ dùng khi **đổi stage** bị lỗi (màu đỏ).

### SAU
- **onSuccess:** gọi `setRefreshTrigger` + **setToast** dạng success: *"Imported N lead(s) successfully"* (hoặc "Import complete"), tự tắt sau 3 giây.
- **onError:** setToast với nội dung lỗi, tự tắt sau 4 giây.
- Thêm state **`toastVariant`** (`'success'` | `'error'`) để toast hiển thị màu xanh (success) hoặc đỏ (error).
- Toast khi **đổi stage** lỗi: set `toastVariant('error')` trước khi set nội dung.
- JSX toast: thêm class `leads-toast-success` khi `toastVariant === 'success'`.

---

## 4. LeadsKanban.css

### TRƯỚC
- `.leads-toast` có style đỏ (error).

### SAU
- Thêm class **`.leads-toast.leads-toast-success`**: nền xanh, chữ xanh đậm, viền xanh (giống pattern success ở các trang khác).

---

## Tóm tắt file bị sửa

| File | Nội dung thay đổi |
|------|-------------------|
| `frontend/src/pages/LeadDetailPage.jsx` | Toast state + try/catch trong `handleDetailsSubmit` + block hiển thị toast success/error |
| `frontend/src/components/leads/ImportLeadsModal.jsx` | Prop `onError`, gọi `onError` thay vì `alert` ở 3 chỗ; `onSuccess(result)` |
| `frontend/src/pages/LeadsPage.jsx` | `toastVariant` state; truyền `onSuccess`/`onError` vào ImportLeadsModal; toast div dùng variant |
| `frontend/src/styles/LeadsKanban.css` | Class `.leads-toast-success` |

---

## Cách hoàn tác (revert) nếu không muốn giữ

Dùng Git để xem diff và revert từng file:

```bash
git diff frontend/src/pages/LeadDetailPage.jsx
git diff frontend/src/components/leads/ImportLeadsModal.jsx
git diff frontend/src/pages/LeadsPage.jsx
git diff frontend/src/styles/LeadsKanban.css
```

Hoặc revert toàn bộ các file trên:

```bash
git checkout -- frontend/src/pages/LeadDetailPage.jsx frontend/src/components/leads/ImportLeadsModal.jsx frontend/src/pages/LeadsPage.jsx frontend/src/styles/LeadsKanban.css
```

---

Nếu bạn đồng ý với các thay đổi trên, không cần làm gì thêm. Nếu muốn bỏ phần nào (ví dụ chỉ giữ toast ở LeadDetailPage, bỏ toast Import), nói rõ mình sẽ chỉnh lại cho đúng ý bạn.
