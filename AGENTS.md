# AGENTS.md — Chỉ thị trung tâm cho coding agent trên dự án BriMed

> **Vai trò của file này**: mọi coding agent (Claude Code, Cursor, ZCode, v.v.) hoạt động trên repo này **bắt buộc đọc toàn bộ file** trước khi làm bất kỳ việc gì. Nếu nhiệm vụ được giao mâu thuẫn với file này → dừng lại và hỏi chủ dự án, không tự quyết.

---

## 1. Sản phẩm & vai trò

**BriMed** — nền tảng "Toa thuốc điện tử nhanh tại quầy" (Gò Vấp, TP.HCM): bệnh nhân quét QR tại nhà thuốc đối tác → khai triệu chứng → trả phí → bác sĩ thật gọi video ngắn → kê đơn điện tử ký số → nhà thuốc đối soát mã và cấp thuốc.

| Vai trò | Cổng | Nghiệp vụ chính |
|---|---|---|
| Bệnh nhân | `/patient/*` | Chọn BS/đặt lịch → khai form → VietQR → gọi video → nhận đơn → gửi đơn đến NT (đề xuất theo kho+giá, pickup/giao nhà) → theo dõi, nhắc uống, huỷ/hoàn tiền |
| Bác sĩ | `/doctor/*` | Lịch trực (slot, ack, huỷ an toàn), hàng đợi ưu tiên, gọi video ≤7p, kê đơn + kiểm kháng sinh, duyệt đổi hoạt chất, thù lao |
| Nhà thuốc | `/pharmacy/*` | Onboarding, tồn kho, tiếp nhận theo mã, đổi hoạt chất, báo giá + 4 bước giao nhận |
| Quản trị | `/admin/*` | KPI (ca kẹt, kháng sinh, doanh thu), khách quan tâm, phê duyệt đối tác (provision), tạo tài khoản, can thiệp phiên (gắn lại BS / huỷ-hoàn tiền), chốt thuê bao, reset demo |

**Mô hình tài chính (bất biến)**: 25.000đ/lượt khám (VietQR) — BS nhận 15.000đ, BriMed giữ 10.000đ (gồm GTGT). Nhà thuốc: tháng đầu miễn phí → 500.000đ/tháng (6 tháng đầu) → 900.000đ/tháng. **Không thu hoa hồng tiền thuốc.** Token đã bỏ hoàn toàn — không tái引入.

## 2. Kiến trúc

```
web/            React 18 + Vite + TS + Tailwind + Zustand + React Router (dev port 5173, /api proxy → 4000)
server/         Express + TypeScript (tsx) + pg (Postgres/Neon), port 4000
  src/routes/   auth | catalog | patient | doctor | pharmacy | admin (REST theo vai trò)
  src/db.ts     Pool + toàn bộ DDL & migration qua ensureDb() (idempotent)
  src/livekit.ts Token video call
api/index.ts    ★ Serverless entry cho VERCEL PRODUCTION (/api/* → đây, KHÔNG phải server/src/index.ts)
vercel.json     installCommand/buildCommand/outputDirectory + rewrite /api/(.*) → /api/index + SPA fallback
```

- **Production**: https://www.brimed.id.vn (Vercel, env đặt trong dashboard: DATABASE_URL, LIVEKIT_*).
- **DB**: Neon Postgres — schema 15 bảng (users, sessions, health_profiles, medicines, pharmacies, inventory, consultations, prescriptions, orders, transactions, substitution_requests, reminders, partner_registrations, patient_leads, doctor_slots).

## 3. Cấu trúc thư mục (web/src)

```
api/client.ts              fetch wrapper api() + Bearer token (localStorage 'brimed_token') + fmtVnd/fmtDate/timeAgo
components/common/         Misc (Modal, EmptyState, PageLoading…), SeoMeta, Toasts
components/domain/         VietQRPay, VideoCallRoom (LiveKit), RoleSwitcher
components/landing/        Landing.tsx + landing.css (scope .lp — trang chủ công khai)
components/layout/         AppShell (nav + badge + banner cuộc gọi toàn cục)
pages/                     Auth, Home, Partner, PackagePage + 4 thư mục theo vai trò
pages/patient|doctor|pharmacy|admin/   7|4|5|1 trang
store/                     auth.ts (useAuth), ui.ts (toast) — Zustand
data/constants.ts          ★ Nguồn dữ liệu dùng chung (giá, FAQ, trạng thái, thanh.leading…)
```

## 4. Quy ước code BẮT BUỘC

1. **Màu**: chỉ dùng token Tailwind có sẵn (`primary, pink{,pastel,dark}, skyblue, lightblue, lightpink, bluedark, mint{bg,fg}, redflag{bg,fg}`). **Cấm** hex tùy ý, cấm gradient, cấm màu xanh lá (brand = xanh dương + trắng + hồng pastel).
2. **Font**: Be Vietnam Pro; nút bấm ≥44px (mobile-first, kiểm tra ở 390px).
3. **Gọi API**: luôn qua `api('/path')` từ `web/src/api/client.ts` (tự gắn Bearer). Không fetch trực tiếp.
4. **Phân quyền**: server dùng `requireRole('role')`; web dùng `RequireRole` route guard trong App.tsx. Route mới phải có đủ 2 lớp.
5. **DB migration**: chỉ thêm vào `ensureDb()` trong `server/src/db.ts` — dạng `ALTER TABLE ... IF NOT EXISTS` / `ADD CONSTRAINT` idempotent (chạy lại không lỗi). **Cấm** viết migration one-shot ngoài hệ thống.
6. **Dynamic import trong server**: bắt buộc đuôi `.js` (`await import('../livekit.js')`) — Vercel ESM resolution, quên là deploy fail (đã gặp 2 lần).
7. **Export dùng chung**: `pages/Home.tsx` export `PublicHeader, PublicFooter, PAIN_ICONS, TestimonialCard` — Partner/PackagePage đang import; không được xoá/đổi signature.
8. **Landing scope**: mọi CSS trang chủ nằm trong `components/landing/landing.css` dưới prefix `.lp` — không leak style ra portal.
9. **Commit message**: tiếng Việt, mô tả rõ đã làm gì + vì sao (xem git log để bắt tone).
10. **Sao chép nội dung (copy)**: luôn viết như sản phẩm hoàn thiện sẵn sàng dùng — cấm từ kiểu "demo, thử nghiệm, mockup, sắp ra mắt, dùng thử".

## 5. NGHIÊM CẤM

- ❌ Tự ý `vercel --prod` / deploy production — chỉ chủ dự án duyệt.
- ❌ Hardcode secret/API key vào code; env chỉ qua biến môi trường.
- ❌ Đổi schema DB ngoài `ensureDb()`; xoá cột/bảng không có migration an toàn.
- ❌ Đổi đường dẫn API đang dùng hoặc bỏ token auth trên endpoint cần bảo vệ.
- ❌ Push thẳng `main` khi làm tính năng lớn — tạo branch `feature/...` từ main, PR chờ duyệt. (Commit doc/fix nhỏ trên main thì được.)
- ❌ Đụng repo `KDTT` hoặc 4 nhánh `giai-doan-1..4` trừ khi được giao đích danh.
- ❌ Bỏ qua bước build/tsc khi có thay đổi code (xem mục 6).

## 6. Quy trình làm việc chuẩn khi được giao việc (5 bước)

1. **Hiểu nhiệm vụ** — đọc spec + mở các file liên quan theo cấu trúc mục 3; nếu thiếu thông tin → hỏi, không đoán.
2. **Plan ngắn** — nêu danh sách file sẽ đụng + ảnh hưởng nghiệp vụ (1 đoạn), gửi chủ dự án nếu là thay đổi kiến trúc/DB.
3. **Code** — tuân thủ mục 4. Xong: `npx tsc --noEmit` ở **cả web/ và server/**, rồi `npm run build` ở web/.
4. **Test thực tế** — tối thiểu 1 trong 2:
   - API: chạy backend local (env xem `.env.example`) + gọi endpoint bằng curl/python, đủ cả nhánh lỗi (403/409/400).
   - UI: `npm run dev` web, kiểm 390px (mobile) và 1280px; tương tác thật, không chỉ nhìn.
5. **Commit + push** branch (hoặc main nếu nhỏ), mô tả rõ. **Không tự deploy** — báo chủ dự án kèm kết quả test.

## 7. Chạy & test cục bộ

```bash
npm run setup     # cài 2 phía + seed
npm run dev       # concurrently server(4000) + web(5173)
npm run build     # build web
npm run seed      # reset dữ liệu mẫu (bảo toàn lead/đăng ký đối tác thật)
```
Env bắt buộc cho server (xem `.env.example`, không có trong repo — xin chủ dự án): `DATABASE_URL` (Neon), `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `PORT` (mặc định 4000).

Tài khoản demo: admin `0900000001/admin@2026` · bệnh nhân `0901234567/123456` · bác sĩ `0908888881/123456` · nhà thuốc `0907777771/123456`.
Lưu ý: BS chỉ "đang trực tuyến" khi có hoạt động trong 10 phút (heartbeat) — demo dài thì mở 1 tab đăng nhập BS.

## 8. Kiến thức nghiệp vụ lõi — các INVARIANT phải giữ khi sửa

5 chuỗi đa vai trò: **(A)** đặt lịch hẹn BN↔BS · **(B)** khám ngay + video BN↔BS · **(C)** cấp phát thuốc BN↔NT↔BS (kể cả vòng đổi hoạt chất) · **(D)** tài chính (thu/chi/hoàn) · **(E)** vận hành sự cố (admin).

| Invariant | Ý nghĩa |
|---|---|
| Lượt chỉ vào hàng đợi BS khi `payment_status='paid'` | Không bao giờ cho BS nhận lượt chưa trả tiền |
| Ghế slot unpaid chỉ giữ **15 phút** | Quá hạn → huỷ lượt + trả ghế (cả khi pay muộn) |
| Ownership window **5 phút** | Ca bệnh nhân chỉ định BS X — 5 phút đầu BS khác bị 403 |
| `in_call` quá **20 phút** tự về `pending` | Chống treo vĩnh viễn khi BS đóng tab |
| Online thật: `doctor_online=1` **và** last_seen ≤ **10 phút** | Không hiển thị "trực tuyến" sai thực tế |
| Hàng đợi: slot-đến-giờ → chỉ định mình → walk-in FIFO; slot tương lai tách nhóm `upcoming` | Thứ tự xử lý cố định |
| Hoàn 25.000đ tự động | BN huỷ trước xử lý, hoặc admin force-close phiên đã trả |
| Đề xuất + chặn quầy **0 thuốc** khi gửi đơn | Máy chủ 409 kèm gợi ý quầy có hàng |
| Thanh toán idempotent | Xác nhận 2 lần không sinh 2 giao dịch |

## 9. Cạm bẫy đã biết (đã trả giá)

- Dynamic import thiếu `.js` → Vercel build fail (mục 4.6).
- Port 5173/5174 có thể bị project khác chiếm → kiểm `netstat` trước, đổi port nếu cần.
- Thanh toán VietQR hiện là **xác nhận của bệnh nhân** (chưa đối soát payOS — đang chờ key). Đừng ghi "đã đối soát" vào copy.
- Notification là polling 15s trong web (AppShell) — không có push Zalo/SMS; copy không được hứa.
- Tailwind purge: class chỉ build khi nằm nguyên văn trong file — tránh nối chuỗi class động phức tạp.

## 10. Phê duyệt & liên hệ

- **Chủ dự án** (người giao việc) là người duyệt duy nhất cho: thay đổi kiến trúc, migration DB, deploy production, đổi mô hình phí/nghiệp vụ y khoa.
- Agent nhận việc chỉ thực hiện trong phạm vi được giao; phát hiện lỗi ngoài phạm vi → báo cáo, không tự sửa kéo theo.
- Tài liệu tham khảo sẵn có trong `docs/`: tài liệu kỹ thuật, báo cáo hành trình người dùng, kế hoạch kiểm thử UAT (51 kịch bản).

*Sau khi đọc xong file này, xác nhận ngắn gọn với người giao việc rằng bạn đã nộp quy tắc trước khi bắt đầu code.*
