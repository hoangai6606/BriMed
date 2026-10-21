# BriMed — Website giới thiệu dịch vụ

**"Đơn thuốc an toàn cho bạn an tâm"** · *Không có đơn? Gặp bác sĩ ngay tại quầy.*

Website giới thiệu (landing site) của **BriMed – Toa thuốc điện tử nhanh tại quầy cho bệnh thông thường**: khách đến nhà thuốc mua thuốc cảm cúm, viêm họng nhưng chưa có toa — quét mã QR, bác sĩ từ xa gọi ngắn khám và ký đơn thuốc điện tử hợp lệ, mua thuốc ngay tại quầy trong khoảng 10 phút.

## Các trang

| Route | Nội dung |
|---|---|
| `/` | Trang chủ: giới thiệu BriMed, nỗi đau khách hàng, quy trình 5 bước, bảng giá minh bạch kèm luồng nạp token minh họa, đánh giá khách hàng, FAQ, form nhận danh sách nhà thuốc, CTA |
| `/nha-thuoc-doi-tac` | Trang dành cho nhà thuốc đối tác: quyền lợi, hai gói thuê bao, ưu đãi khai trương, FAQ nhà thuốc, form đăng ký hợp tác |
| `/goi-1-thang-brimed-nha-thuoc` | Landing gói 1 tháng (1.200.000đ/tháng) |
| `/goi-3-thang-brimed-nha-thuoc` | Landing gói 3 tháng (2.700.000đ/3 tháng — bình quân 900.000đ/tháng) |

## Công nghệ

- React 18 + TypeScript + Vite 5
- Tailwind CSS 3 (design tokens thương hiệu: `#0d71e2` / `#e8408a`)
- React Router 6, lucide-react
- Font Be Vietnam Pro, thiết kế mobile-first (375–430px) mở rộng dashboard trên desktop

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build tĩnh vào dist/
npm run preview  # xem bản build
```

## Triển khai

Bản build là site tĩnh trong `dist/`. Có thể deploy lên Vercel / Netlify / Cloudflare Pages / GitHub Pages.
Khi triển khai dạng SPA, cấu hình rewrite mọi đường dẫn về `index.html` để các route hoạt động đúng.

## Phạm vi repository

Repository này chứa **website giới thiệu công khai**. Hệ thống vận hành nội bộ (backend, cơ sở dữ liệu và phân hệ đăng nhập của Bệnh nhân / Bác sĩ / Nhà thuốc / Quản trị viên) được phát triển riêng và không nằm trong repo này.

## Liên hệ

Hotline: **1900 2026** · Triển khai tại Quận Gò Vấp, TP.HCM.

© 2026 BriMed.
