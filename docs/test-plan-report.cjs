/* Báo cáo Hành trình người dùng & Nghiệp vụ đa vai trò BriMed — bản cập nhật theo main 320e76b */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, TableOfContents, TableLayoutType, SectionType,
} = require('docx');
const fs = require('fs');

/* ── Palette MC-1 Medical Blue ── */
const MC1 = {
  bg: 'F5F8FC', primary: '1A5276', accent: '2E86C1',
  cover: { titleColor: '1A5276', subtitleColor: '606060', metaColor: '707070', footerColor: 'A0A0A0' },
  table: { headerBg: '2E86C1', headerText: 'FFFFFF', accentLine: '1A5276', innerLine: 'D0DDE8', surface: 'EDF3F8' },
};
const P = MC1;
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const FONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman' };
const FONT_H = { ascii: 'Arial', hAnsi: 'Arial' };

/* ── Cover helpers (R1, bản Latin) ── */
function splitTitleLines(title, cpl) {
  if (title.length <= cpl) return [title];
  const breakAfter = new Set([...' \t', ...'-_/·,;:']);
  const lines = []; let rem = title;
  while (rem.length > cpl) {
    let at = -1;
    for (let i = cpl; i >= Math.floor(cpl * 0.6); i--) if (i < rem.length && breakAfter.has(rem[i - 1])) { at = i; break; }
    if (at === -1) { const lim = Math.min(rem.length, Math.ceil(cpl * 1.3)); for (let i = cpl + 1; i < lim; i++) if (breakAfter.has(rem[i - 1])) { at = i; break; } }
    if (at === -1) at = cpl;
    lines.push(rem.slice(0, at).trim()); rem = rem.slice(at).trim();
  }
  if (rem) lines.push(rem);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) { const l = lines.pop(); lines[lines.length - 1] += ' ' + l; }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const cw = (pt) => Math.round(pt * 11);
  const cpl = (pt) => Math.floor(maxWidthTwips / cw(pt));
  let pt = preferredPt, lines;
  while (pt >= minPt) { const c = cpl(pt); if (c < 2) { pt -= 2; continue; } lines = splitTitleLines(title, c); if (lines.length <= 3) break; pt -= 2; }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, cpl(minPt)); pt = minPt; }
  return { titlePt: pt, titleLines: lines };
}
function calcCoverSpacing(p) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false, metaLineCount = 0, fixedHeight = 800, pageHeight = 16838 } = p;
  const SAFETY = 1200; const usable = pageHeight - SAFETY;
  const content = titleLineCount * (titlePt * 23 + 200) + (hasSubtitle ? 876 : 0) + (hasEnglishLabel ? 807 : 0) + metaLineCount * 330 + fixedHeight + 900;
  const safe = Math.max(usable - content, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safe * 0.45), rawBottom = Math.floor(safe * 0.45);
  const bottom = Math.max(rawBottom, FOOTER_MIN);
  const top = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing: top, bottomSpacing: bottom };
}
function buildCoverR1(config) {
  const Pc = config.palette; const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const spacing = calcCoverSpacing({ titleLineCount: titleLines.length, titlePt, hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel, metaLineCount: (config.metaLines || []).length, fixedHeight: 400 });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: Pc.accent, space: 12 };
  const children = [new Paragraph({ spacing: { before: spacing.topSpacing } })];
  if (config.englishLabel) children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: Pc.accent, space: 8 } },
    children: [new TextRun({ text: config.englishLabel.split('').join('  '), size: 18, color: Pc.accent, font: FONT_H })],
  }));
  titleLines.forEach((ln, i) => children.push(new Paragraph({
    indent: { left: padL },
    spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: 'atLeast' },
    children: [new TextRun({ text: ln, size: titlePt * 2, bold: true, color: Pc.titleColor, font: FONT_H })],
  })));
  if (config.subtitle) children.push(new Paragraph({ indent: { left: padL }, spacing: { after: 800 }, children: [new TextRun({ text: config.subtitle, size: 24, color: Pc.subtitleColor, font: FONT })] }));
  for (const line of (config.metaLines || [])) children.push(new Paragraph({
    indent: { left: padL + 200 }, spacing: { after: 80 }, border: { left: accentLeft },
    children: [new TextRun({ text: line, size: 22, color: Pc.metaColor, font: FONT })],
  }));
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: Pc.accent, space: 8 } }, spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || '', size: 16, color: Pc.footerColor, font: FONT_H }),
      new TextRun({ text: '                                        ' }),
      new TextRun({ text: config.footerRight || '', size: 16, color: Pc.footerColor, font: FONT_H }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: allNoBorders,
    rows: [new TableRow({ height: { value: 16838, rule: 'exact' }, children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: Pc.bg }, borders: noBorders, children })] })],
  })];
}

/* ── Content helpers ── */
const USABLE = 11906 - 1701 - 1417;
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 }, children: [new TextRun({ text: t, bold: true, size: 32, color: P.primary, font: FONT_H })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120, line: 312 }, children: [new TextRun({ text: t, bold: true, size: 26, color: P.primary, font: FONT_H })] });
const body = (t) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 312 }, children: [new TextRun({ text: t, size: 22, color: '1A2B40', font: FONT })] });
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 312 }, children: [new TextRun({ text: t, size: 22, color: '1A2B40', font: FONT })] });
const tableTitle = (t) => new Paragraph({ keepNext: true, spacing: { before: 160, after: 80, line: 312 }, children: [new TextRun({ text: t, bold: true, size: 21, color: P.primary, font: FONT_H })] });
const noteBox = (t) => new Paragraph({
  spacing: { before: 80, after: 140, line: 312 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: P.accent, space: 10 } },
  indent: { left: 200 }, shading: { type: ShadingType.CLEAR, fill: P.table.surface },
  children: [new TextRun({ text: t, size: 21, color: '1A2B40', font: FONT, italics: true })],
});
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };
const cellPara = (t, o = {}) => new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: t, size: 20, color: o.color || '1A2B40', bold: !!o.bold, font: FONT })] });
function tableFrom(headers, rows, widths) {
  if (!widths || !widths.length) widths = headers.map(() => Math.floor(USABLE / headers.length))
  const scale = USABLE / widths.reduce((a, b) => a + b, 0);
  const w = widths.map(x => Math.round(x * scale));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine }, bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine }, insideVertical: NB,
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((hh, i) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.table.headerBg }, margins: cellMargins, width: { size: w[i], type: WidthType.DXA }, children: [cellPara(hh, { color: P.table.headerText, bold: true })] })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: ri % 2 === 1 ? P.table.surface : 'FFFFFF' }, margins: cellMargins, width: { size: w[i], type: WidthType.DXA }, children: [cellPara(c, { bold: i === 0 && r.length > 2 })] })) })),
    ],
  });
}
const spacer = () => new Paragraph({ spacing: { after: 120 } });

/* ═════════ NỘI DUNG: KẾ HOẠCH KIỂM THỬ TOÀN BỘ CHỨC NĂNG ═════════ */
const B = [];

/* 1. GIỚI THIỆU */
B.push(h1('1. Mục đích, phạm vi và cách dùng tài liệu'));
B.push(body('Tài liệu này là kế hoạch kiểm thử chấp nhận (UAT) toàn diện cho brimed.id.vn (nhánh main hiện hành): liệt kê đầy đủ chức năng đã xây theo từng vai trò, kèm cách test chi tiết bằng trải nghiệm người dùng thật trên giao diện — mỗi bước ghi rõ thao tác và kết quả kỳ vọng để người kiểm chỉ cần làm theo và đánh Đạt/Không đạt. Phạm vi phủ cả nghiệp vụ đơn vai trò (một tài khoản tự kiểm) và chuỗi đa vai trò đầu cuối. Ma trận ở chương 8 bảo đảm không chức năng nào bị bỏ sót kiểm thử.'));
B.push(tableTitle('Bảng 1.1 — Chuẩn bị trước khi kiểm thử'));
B.push(tableFrom(['Việc cần làm', 'Chi tiết'], [
  ['Môi trường', 'Mở brimed.id.vn trên trình duyệt; khuyến nghị 2 cửa sổ riêng (1 cho Bệnh nhân, 1 cho Bác sĩ/Nhà thuốc) để nhìn đồng thời hai vai trò; cho phép camera và micro khi trình duyệt hỏi (cho cuộc gọi video)'],
  ['Tài khoản mẫu', 'Admin 0900000001/admin@2026 · Bệnh nhân 0901234567/123456 · Bác sĩ 0908888881/123456 · Nhà thuốc 0907777771/123456'],
  ['Về trạng thái chuẩn', 'Mỗi vòng kiểm thử mở đầu bằng: Admin → tab khác → nút Khôi phục dữ liệu mẫu (dữ liệu khách quan tâm/đăng ký đối tác thật luôn được bảo toàn)'],
  ['Ghi kết quả', 'Với mỗi mã kịch bản (VD P1, D2, E-B4…): đánh Đạt/Không đạt, ghi chú, chụp màn hình khi Không đạt. Nếu một nghiệp vụ nền FAIL → tạm khoá các kịch bản phụ thuộc nó để tránh nhầm nguồn lỗi'],
  ['Quy ước tên mục', 'Bệnh nhân dùng mục trên thanh điều hướng: Tổng quan, Toa thuốc nhanh, Hồ sơ sức khỏe, Đơn thuốc của tôi, Tìm thuốc, Đơn hàng, Lịch sử & Nhắc uống; Bác sĩ: Hàng đợi (Tổng quan), Lịch trực, Đơn thuốc, Hồ sơ BN; Nhà thuốc: Tổng quan, Tiếp nhận, Tồn kho, Đơn hàng; Admin: các tab trên Bảng điều khiển'],
], [2200, 6588]));

/* 2. KHÁCH TRUY CẬP */
B.push(h1('2. Khách truy cập — trang công khai'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['K1', 'Mở trang chủ, để yên 6 giây', 'Hero carousel tự chuyển qua 3 màn: Tư vấn ngay → Cổng bệnh nhân → Dashboard nhà thuốc; bấm mũi tên/chấm tròn chuyển tay được'],
  ['K2', 'Bấm "Tư vấn ngay" / "Đăng Nhập" / "Dành cho nhà thuốc"', 'Đều dẫn về trang đăng nhập hoặc trang đối tác đúng; không có từ ngữ thử nghiệm/thiếu sót'],
  ['K3', 'Cuộn qua Lợi ích – Cách hoạt động – Chi phí – Câu hỏi', '5 bước quy trình, 2 thẻ giá (25.000đ/lượt và 500.000đ/tháng), khối QR thanh toán, thẻ an toàn bệnh được khám từ xa/cần khám trực tiếp, 6 câu hỏi mở gọn được'],
  ['K4', 'Điền form "Nhận danh sách nhà thuốc" (tên + SĐT) → gửi', 'Thông báo đã nhận; Admin thấy bản ghi mới ở tab Khách hàng quan tâm'],
  ['K5', 'Vào trang Dành cho nhà thuốc → điền form đăng ký đối tác đầy đủ → gửi', 'Thông báo đã nhận yêu cầu; Admin thấy ở tab Đăng ký đối tác trạng thái Mới'],
  ['K6', 'Trang đăng nhập → "Đăng ký ngay" → tạo tài khoản bệnh nhân (SĐT 10 số, mật khẩu ≥6) → đăng nhập', 'Vào được cổng Bệnh nhân ngay; đăng ký lại trùng SĐT bị từ chối'],
], [600, 3300, 4888]));

/* 3. BỆNH NHÂN */
B.push(h1('3. Bệnh nhân — toàn bộ chức năng'));
B.push(h2('3.1 Tổng quan và hồ sơ'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['P1', 'Đăng nhập → xem Tổng quan', 'Thẻ thành viên; mục "Bác sĩ đang trực tuyến (n)" với 3 bác sĩ có ảnh + nút hồng "Tư vấn ngay"; khi 0 BS online hiển thị thông báo rõ + thời gian phản hồi trung bình'],
  ['P2', 'Hồ sơ sức khỏe: sửa tiền sử/dị ứng/chỉ số → Lưu; gạt công tắc chia sẻ', 'Dữ liệu lưu đúng; công tắc bật/tắt được; trạng thái phản ánh ngay'],
  ['P3', 'Đăng xuất → đăng nhập lại', 'Về đúng cổng bệnh nhân; dữ liệu còn nguyên'],
], [600, 3300, 4888]));
B.push(h2('3.2 Chọn bác sĩ, đặt lịch, khai form, thanh toán'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['P4', 'Toa thuốc nhanh → Bước 1: xem danh sách BS', 'BS online có ảnh, chuyên khoa, nhãn "Chứng chỉ hành nghề đã xác minh"; BS offline có lịch hiện "Lịch trống sớm nhất"'],
  ['P5', 'Bấm một bác sĩ → xem hồ sơ', 'Modal hiện ảnh lớn, giấy phép đã xác minh, thời gian phản hồi TB; BS online có nút "Bắt đầu tư vấn ngay", BS offline hiện danh sách khung giờ (giờ, số chỗ còn)'],
  ['P6', 'Đặt một khung giờ → "Tiếp tục với lịch hẹn đã chọn" → khai form → gửi', 'Chuyển Bước 2 khai triệu chứng; thanh toán hiện QR VietQR 25.000đ, nội dung BRIMED + mã lượt; banner xác nhận lịch hẹn kèm giờ dự kiến tới lượt'],
  ['P7', 'Bấm "Tôi đã chuyển khoản — Xác nhận" rồi bấm lần 2', 'Lần 1 thành công; lần 2 thông báo "đã được thanh toán" — không sinh giao dịch trùng'],
  ['P8', 'Chọn "Thanh toán sau" → về Tổng quan', 'Lượt nằm ở mục "Yêu cầu tư vấn chờ thanh toán" với nút Thanh toán'],
  ['P9', 'Kiểm tra ghế 15 phút: đặt lịch 1 chỗ nhưng không trả tiền, chờ hơn 15 phút rồi bấm Thanh toán', 'Bị từ chối "Ghế đặt lịch đã hết hạn…", lượt tự huỷ, không mất tiền'],
  ['P10', 'Khai form đánh dấu "Trẻ nhỏ" hoặc "Khó thở" rồi gửi', 'Chặn ngay với cảnh báo y khoa, hướng dẫn khám trực tiếp và nhắc gọi 115; không tạo lượt, không thu phí'],
  ['P11', 'Không để BS nào online (chờ >10 phút không ai thao tác) → thử gửi form', 'Máy chủ chặn: không thể gửi khi không có BS trực tuyến và không đặt lịch — kể cả thao tác nhanh'],
], [600, 3300, 4888]));
B.push(h2('3.3 Cuộc gọi video và đơn thuốc'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['P12', 'Sau khi BS gọi (kịch bản B3): rời sang trang Đơn thuốc, chờ ≤15 giây', 'Banner nổi "Bác sĩ đang gọi bạn" hiện ở mọi trang kèm tên BS; bấm để vào phòng gọi'],
  ['P13', 'Vào phòng gọi, nói chuyện, một bên rời phòng; để cuộc gọi chạy hết 7 phút ở lần khác', 'Đồng hồ 00:00/07:00 đếm lên; kết thúc khi một bên thoát; hết 7 phút tự ngắt'],
  ['P14', 'Đơn thuốc của tôi → xem đơn mới kê', 'Mã VN-Rx kèm chữ ký số; đủ vị thuốc, liều dùng; đơn bị từ chối hiển thị lý do'],
  ['P15', 'Mục Lịch sử & Nhắc uống sau khi được kê đơn', 'Nhắc uống tự sinh cho từng vị thuốc (Sáng/Trưa/Tối, kèm liều); chỉnh sửa/tắt/xoá được; thêm nhắc tay cho thuốc ngoài đơn cũng được'],
  ['P16', 'Lịch sử & Nhắc uống → "In / Lưu PDF lịch sử khám"', 'Mở hộp thoại in sạch (ẩn nút lệnh), lưu PDF được'],
], [600, 3300, 4888]));
B.push(h2('3.4 Gửi đơn đến nhà thuốc và theo dõi'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['P17', 'Đơn thuốc → "Gửi đơn đến quầy nhà thuốc"', 'Danh sách xếp hạng: sao đề xuất cho quầy "Đủ N/N thuốc · khoảng giá"; quầy thiếu gắn "Thiếu N thuốc"'],
  ['P18', 'Chọn "Giao tận nhà", bỏ trống địa chỉ → Xác nhận', 'Bị chặn cho đến khi nhập địa chỉ'],
  ['P19', 'Nhập địa chỉ → Xác nhận', 'Đơn hàng tạo trạng thái Đã xác nhận, hiện địa chỉ giao'],
  ['P20', 'Chọn thủ công một quầy không có thuốc nào của đơn → Xác nhận', 'Máy chủ từ chối kèm gợi ý quầy có hàng'],
  ['P21', 'Đơn hàng → theo dõi đơn vừa tạo', 'Trạng thái lần lượt Đã xác nhận → Đang chuẩn bị → Sẵn sàng nhận/Đang giao → Hoàn tất đúng thao tác của nhà thuốc'],
], [600, 3300, 4888]));
B.push(h2('3.5 Tiện ích khác'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['P22', 'Tìm thuốc → gõ "paracetamol"', 'Kết quả kèm hoạt chất; mỗi thuốc có bảng so sánh giá/tồn kho các nhà thuốc với nhãn còn hàng/sắp hết/hết hàng'],
  ['P23', 'Huỷ một lượt chờ (nút Huỷ trên Tổng quan)', 'Xác nhận → huỷ thành công; nếu đã trả 25.000đ có thông báo hoàn tiền; giao dịch hiện khoản hoàn -25.000đ; ghế (nếu là lịch) được giải phóng'],
  ['P24', 'Soát Lịch sử giao dịch', 'Mọi lượt 25.000đ, hoàn -25.000đ có dòng riêng, mô tả rõ'],
], [600, 3300, 4888]));

/* 4. BÁC SĨ */
B.push(h1('4. Bác sĩ — toàn bộ chức năng'));
B.push(h2('4.1 Trực tuyến, hàng đợi, lịch trực'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['D1', 'Đăng nhập rồi ngừng thao tác hơn 10 phút; bệnh nhân mở Bước 1', 'Bác sĩ không còn hiện "đang trực tuyến" (heartbeat tự tắt) — trạng thái không bao giờ ảo'],
  ['D2', 'Mở Hàng đợi khi có: 1 lượt hẹn đã đến giờ, 1 lượt hẹn ngày mai, 1 lượt chỉ định mình, 1 walk-in', 'Thứ tự: lượt hẹn đến giờ trước → lượt chỉ định mình → walk-in theo giờ gửi; lượt hẹn ngày mai nằm riêng nhóm "Lịch hẹn sắp tới" không làm nghẽn hàng đợi'],
  ['D3', 'Dùng tài khoản BS khác thử mở lượt bệnh nhân chỉ định mình trong 5 phút đầu', 'Bị chặn kèm tên bác sĩ được chỉ định; sau 5 phút mở được bình thường'],
  ['D4', 'Lịch trực → mở khung giờ (giờ, phút, số chỗ)', 'Khung giờ xuất hiện với số chỗ còn; bấm "Xác nhận" → nhãn "Đã xác nhận" và bệnh nhân thấy "BS đã xác nhận lịch"'],
  ['D5', 'Huỷ khung giờ không ai đặt', 'Xoá ngay không cần xác nhận'],
  ['D6', 'Huỷ khung giờ đang có bệnh nhân đặt', 'Phải xác nhận lần 2; sau đó các lượt hẹn chuyển về hàng đợi thường (bệnh nhân không mất phí, không mất chỗ); dashboard bệnh nhân cập nhật'],
], [600, 3300, 4888]));
B.push(h2('4.2 Khám, kê đơn, thu nhập'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['D7', 'Mở một lượt → bấm "Gọi video bệnh nhân tại quầy"', 'Phòng gọi LiveKit mở, đồng hồ 07:00; trạng thái lượt chuyển Đang gọi; bệnh nhân nhận banner toàn cục'],
  ['D8', 'Kết thúc cuộc gọi → ghi chú → "Tiến hành kê đơn": chọn thuốc, liều dùng → xác nhận; thử kê thuốc kháng sinh mà không xác nhận chỉ định', 'Đơn phát hành mã VN-Rx + chữ ký số; bệnh nhân thấy đơn và nhắc uống tự sinh; kê kháng sinh bắt buộc xác nhận chỉ định mới cho qua'],
  ['D9', 'Từ chối một lượt (lý do bắt buộc)', 'Đơn trạng thái bị từ chối, bệnh nhân thấy lý do; thù lao 15.000đ vẫn ghi nhận'],
  ['D10', 'Tổng quan → card "Thu nhập của tôi"', 'Hiển thị doanh thu tháng hiện tại (số lượt) và lũy kế; khớp số lượt đã xử lý'],
  ['D11', 'Hồ sơ BN → mở bệnh nhân từng khám với mình', 'Chỉ hiện bệnh nhân có lượt do mình xử lý; bệnh nhân tắt chia sẻ hiển thị trạng thái khoá hồ sơ'],
  ['D12', 'Đơn thuốc → Đơn của tôi', 'Toàn bộ đơn mình kê; không lẫn đơn bác sĩ khác'],
], [600, 3300, 4888]));

/* 5. NHÀ THUỐC */
B.push(h1('5. Nhà thuốc — toàn bộ chức năng'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['S1', 'Tổng quan', 'Số đơn mới/đang xử lý/hoàn tất hôm nay + danh sách tồn kho thấp đúng thực tế'],
  ['S2', 'Tồn kho: thêm thuốc từ danh mục (giá, số lượng) → sửa → đưa số lượng dưới ngưỡng → xoá một mục', 'Thêm/sửa/xoá đúng; thuốc dưới ngưỡng xuất hiện ở cảnh báo Tổng quan; nhà thuốc khác không thấy thay đổi'],
  ['S3', 'Tiếp nhận: nhập/quét mã VN-Rx của đơn bệnh nhân vừa gửi', 'Hiện thông tin đơn; đối kho từng vị: đủ/sắp hết/hết hàng; đơn giao nhà hiển thị địa chỉ'],
  ['S4', 'Tiếp nhận đơn có thuốc hết hàng → chọn thuốc thay thế gợi ý → gửi yêu cầu đổi', 'Yêu cầu tới bác sĩ kê đơn (xem D-E chuỗi C); duyệt xong đơn và giá cập nhật'],
  ['S5', 'Đơn hàng: mở đơn → báo giá (chỉnh giá/phí giao) → Xác nhận → chuyển trạng thái đến Hoàn tất', 'Bốn trạng thái đúng thứ tự; hoàn tất tự trừ tồn kho; bệnh nhân thấy đồng bộ trạng thái'],
  ['S6', 'Tài khoản nhà thuốc khác (An Khang 0907777772) đăng nhập', 'Chỉ thấy dữ liệu của nhà thuốc mình — kho, đơn hàng tách biệt hoàn toàn'],
], [600, 3300, 4888]));

/* 6. ADMIN */
B.push(h1('6. Quản trị viên — toàn bộ chức năng'));
B.push(tableFrom(['Mã', 'Thao tác', 'Kết quả kỳ vọng'], [
  ['M1', 'Tab Tổng quan (KPI)', 'Đủ các thẻ: toa tháng, thời gian chờ, tỷ lệ từ chối, tỷ lệ kháng sinh (ngưỡng 30%), khách quay lại, doanh thu phí khám/B2B, thù lao BS, phút gọi video, số đếm nhân sự; thẻ đỏ "Ca chờ quá 15 phút" chỉ hiện khi thật sự có ca kẹt'],
  ['M2', 'Bấm "Chốt phí thuê bao tháng này" 2 lần', 'Lần 1 chốt từng nhà thuốc 500k/900k đúng kỳ; lần 2 toàn bộ báo đã chốt — không trùng'],
  ['M3', 'Tab Khách hàng quan tâm', 'Danh sách từ form trang chủ; đổi trạng thái Mới → Đã liên hệ → Đã dùng dịch vụ'],
  ['M4', 'Tab Đăng ký đối tác → một đăng ký Mới → "Duyệt & tạo tài khoản"', 'Tạo nhà thuốc + tài khoản quản lý, mật khẩu hiện đúng một lần; trạng thái chuyển "Đã tạo tài khoản nhà thuốc"'],
  ['M5', 'Tab Tài khoản → "+ Tạo tài khoản" → Bác sĩ (tên, SĐT, chuyên khoa, giấy phép)', 'Tài khoản tạo, mật khẩu một lần; đăng nhập được ngay; tạo trùng SĐT bị chặn'],
  ['M6', 'Tab Tài khoản → bấm chuyển trực tuyến một bác sĩ', 'Bệnh nhân thấy bác sĩ này online trong ~10 phút'],
  ['M7', 'Tab Phiên tư vấn: tìm ca đỏ chờ >15 phút đã trả phí → "Gắn cho bác sĩ…" chọn một BS', 'Ca được gắn; BS đó thấy nhãn chỉ định trong hàng đợi'],
  ['M8', 'Một ca không cứu được → "Huỷ & hoàn tiền"', 'Ca đóng; bệnh nhân nhận hoàn 25.000đ (soi giao dịch bên bệnh nhân)'],
  ['M9', 'Tab Danh mục: thêm thuốc mới (cờ kháng sinh, giá tham chiếu); xem Danh mục bệnh', 'Thuốc dùng được ngay khi BS kê và NT nhập kho; danh mục bệnh đúng 11 nhóm TT 30/2023 + danh sách loại trừ'],
  ['M10', 'Bấm "Khôi phục dữ liệu mẫu"', 'Dữ liệu nghiệp vụ về chuẩn; khách hàng quan tâm và đăng ký đối tác thật được bảo toàn'],
], [600, 3300, 4888]));

/* 7. KỊCH BẢN ĐA VAI TRÒ */
B.push(h1('7. Kịch bản đa vai trò đầu cuối'));
B.push(tableFrom(['Mã', 'Chuỗi & các bước chính', 'Kết quả kỳ vọng cuối chuỗi'], [
  ['E-A', 'Đặt lịch hẹn: BN chọn BS offline có lịch → đặt giờ → trả phí (P6) → BS "Xác nhận" (D4) → đến giờ lượt lên đầu hàng đợi', 'BN thấy "BS đã xác nhận"; đến giờ BS nhận đúng lượt ở đầu hàng đợi; huỷ bất kỳ lúc nào trước xử lý → hoàn 25.000đ tự động'],
  ['E-B', 'Khám ngay: BN chọn BS online → trả phí → BS nhận (guard D3) → gọi video (D7 + P12/P13) → kê đơn (D8)', 'BN nhận đơn VN-Rx ký số + nhắc uống tự sinh; thù lao BS tăng đúng 1 lượt'],
  ['E-C', 'Cấp phát thuốc: BN gửi đơn theo đề xuất + giao nhà (P17–P19) → NT tiếp nhận (S3) → [hết hàng: S4 + BS duyệt] → báo giá → hoàn tất (S5)', 'Trạng thái 4 bước khớp 2 bên; tồn kho trừ đúng; đổi hoạt chất cập nhật đơn + giá + chữ ký mới'],
  ['E-D', 'Vận hành: tạo ca kẹt (lượt đã trả không ai nhận >15 phút) → Admin thấy thẻ đỏ (M1) → gắn lại BS (M7) hoặc huỷ-hoàn tiền (M8)', 'Ca được cứu hoặc đóng kèm hoàn tiền; không còn cảnh báo đỏ sau xử lý'],
  ['E-E', 'Tài chính: chốt thuê bao (M2) + soi KPI doanh thu + thù lao BS (D10) + giao dịch BN (P24)', 'Số liệu khớp chuỗi: 25.000đ/lượt → 15.000đ BS; hoàn -25.000đ; B2B 500k/900k không trùng tháng'],
], [800, 3900, 4088]));

/* 8. MA TRẬN PHỦ KIỂM THỬ */
B.push(h1('8. Ma trận phủ kiểm thử chức năng'));
B.push(tableFrom(['Nhóm chức năng', 'Mã kịch bản phủ'], [
  ['Công khai: carousel, giá, FAQ, form lead, form đối tác, đăng ký', 'K1–K6'],
  ['BN: dashboard/BS online, hồ sơ, phiên đăng nhập', 'P1–P3'],
  ['BN: chọn BS/hồ sơ xác minh, đặt lịch, thanh toán, hết hạn ghế, cờ đỏ, chặn 0 BS', 'P4–P11'],
  ['BN: banner gọi, video, đơn thuốc, nhắc uống, in PDF', 'P12–P16'],
  ['BN: đề xuất NT, giao nhà, chặn 0 thuốc, theo dõi đơn, tìm thuốc, huỷ/hoàn tiền, giao dịch', 'P17–P24'],
  ['BS: heartbeat, thứ tự hàng đợi, guard 5 phút, lịch trực mở/xác nhận/huỷ an toàn', 'D1–D6'],
  ['BS: gọi video, kê đơn/kháng sinh, từ chối, thu nhập, hồ sơ BN, đơn của tôi', 'D7–D12'],
  ['NT: tổng quan, kho CRUD/cảnh báo, tiếp nhận/đối kho, đổi hoạt chất, giao nhận, cô lập dữ liệu', 'S1–S6'],
  ['Admin: KPI+ca kẹt, chốt thuê bao, lead, provision, tạo tài khoản, toggle online, phiên tư vấn, danh mục, reset', 'M1–M10'],
  ['Đa vai trò: hẹn – khám – cấp phát – vận hành – tài chính', 'E-A → E-E'],
], [5200, 3588]));
B.push(noteBox('Tổng cộng 51 kịch bản (K6 + P24 + D12 + S6 + M10 + 5 chuỗi E). Mã nào Không đạt → ghi lại ảnh chụp + thời điểm + tài khoản dùng; nhóm cùng nghiệp vụ nền FAIL thì khoá các kịch bản phụ thuộc trước khi kiểm lại.'));

/* 9. MẪU GHI KẾT QUẢ */
B.push(h1('9. Mẫu ghi kết quả kiểm thử'));
B.push(tableFrom(['Mã', 'Người test', 'Thời điểm', 'Kết quả (Đạt/Không đạt)', 'Ghi chú / link ảnh'], [
  ['P1', '', '', '', ''],
  ['P2', '', '', '', ''],
  ['…', '', '', '', ''],
], [900, 1600, 1700, 2100, 2488]));
B.push(body('Sao chép dòng theo số mã kịch bản cần kiểm. Sau khi hoàn tất vòng UAT, tổng hợp số Đạt/Không đạt theo từng nhóm ở chương 8 để có bức tranh phủ kiểm thử toàn hệ thống.'));

/* ═════════ DOCUMENT ═════════ */
const pageFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080', font: FONT })] })] });
const pageHeader = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } }, children: [new TextRun({ text: 'BriMed — Kế hoạch kiểm thử toàn bộ chức năng', size: 16, color: '909090', font: FONT })] })] });

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22, color: '1A2B40' }, paragraph: { spacing: { line: 312 } } } } },
  features: { updateFields: true },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: 'Kế hoạch kiểm thử toàn bộ chức năng BriMed',
        subtitle: '51 kịch bản kiểm thử theo trải nghiệm người dùng — đơn vai trò và đa vai trò đầu cuối',
        englishLabel: 'FULL FEATURE UAT PLAN',
        metaLines: [
          'Hệ thống: brimed.id.vn (main 320e76b)',
          'Đối tượng: người kiểm thử tự thực hiện trên giao diện thật',
          'Ngày lập: 14/11/2026 — Đội phát triển BriMed',
        ],
        footerLeft: 'BriMed — Toa thuốc điện tử nhanh tại quầy', footerRight: 'Tài liệu nội bộ',
        palette: { bg: P.bg, ...P.cover, accent: P.accent },
      }) },
    { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
      headers: { default: pageHeader() }, footers: { default: pageFooter() },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 360 }, children: [new TextRun({ text: 'MỤC LỤC', bold: true, size: 32, color: P.primary, font: FONT_H })] }),
        new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-2' }),
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Ghi chú: Mục lục được sinh bằng trường (field). Sau khi chỉnh sửa tài liệu, hãy nhấp chuột phải vào mục lục và chọn Update Field để cập nhật số trang chính xác.', italics: true, size: 18, color: '888888', font: FONT })] }),
      ] },
    { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: pageHeader() }, footers: { default: pageFooter() },
      children: B },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('BriMed-KeHoach-KiemThu-ToanBoChucNang.docx', buf);
  console.log('OK', Math.round(buf.length / 1024) + ' KB');
});
