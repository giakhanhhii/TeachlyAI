# God component & line limits (code only)

Giới hạn dòng dưới đây chỉ áp dụng cho **mã nguồn** (JS/TS/Python…), không áp cho HTML/CSS shell hay asset tĩnh — xem `.cursor/rules/core-directives.mdc`.

- Views/components: ~300 dòng (hướng dẫn, không cứng để “cắt” file).
- Services/controllers: ~350 dòng.
- Nếu file vượt: tách theo **trách nhiệm**, không theo quota.

**Shell slide:** `slide_html_template/**`, `frontend/slide_html_template/**` — không tách/chỉnh chỉ vì dài; chỉ sửa khi có task rõ hoặc sửa lỗi.
