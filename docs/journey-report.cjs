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

/* ═════════ NỘI DUNG ═════════ */
const B = [];

/* 1. TỔNG QUAN */
B.push(h1('1. Tổng quan hệ thống'));
B.push(body('Tài liệu mô tả toàn bộ hành trình người dùng theo từng vai trò và các nghiệp vụ liên kết đa vai trò trên hệ thống BriMed ở phiên bản hiện hành (nhánh main, mã 320e76b, đang vận hành tại brimed.id.vn). Nội dung phản ánh đúng trạng thái sau đợt hoàn thiện nghiệp vụ: chọn bác sĩ trực tiếp, đặt lịch khung giờ, gọi video, đề xuất nhà thuốc theo tồn kho, giao tận nhà, huỷ/hoàn tiền tự động, giám sát ca kẹt của quản trị viên.'));
B.push(tableTitle('Bảng 1.1 — Vai trò và phạm vi nghiệp vụ'));
B.push(tableFrom(['Vai trò', 'Kênh', 'Nghiệp vụ chính'], [
  ['Khách truy cập', 'Trang công khai', 'Tìm hiểu dịch vụ, để lại thông tin liên hệ, đăng ký tài khoản bệnh nhân, đăng ký đối tác'],
  ['Bệnh nhân', '/auth → /patient/*', 'Chọn bác sĩ - đặt lịch - khai triệu chứng - thanh toán - gặp bác sĩ qua video - nhận đơn - gửi đơn đến nhà thuốc - theo dõi giao nhận - nhắc uống - huỷ/hoàn tiền'],
  ['Bác sĩ', '/auth → /doctor/*', 'Lịch trực (mở khung giờ, xác nhận lịch hẹn), hàng đợi ưu tiên, gọi video, kê đơn ký số, duyệt đổi hoạt chất, xem thù lao'],
  ['Nhà thuốc', '/auth → /pharmacy/*', 'Tồn kho, tiếp nhận đơn theo mã, đối kho và gợi ý thay thế, báo giá, giao nhận tại quầy/tận nhà'],
  ['Quản trị viên', '/auth → /admin/*', 'KPI vận hành, khách hàng quan tâm, phê duyệt và cấp tài khoản đối tác, quản lý tài khoản, can thiệp phiên kẹt, chốt phí thuê bao, danh mục'],
], [1300, 2000, 5488]));
B.push(spacer());

/* 2. MÔ HÌNH PHÍ & NGUYÊN TẮC */
B.push(h1('2. Mô hình phí và nguyên tắc vận hành'));
B.push(tableTitle('Bảng 2.1 — Mô hình tài chính hiện hành'));
B.push(tableFrom(['Đối tượng', 'Mức phí', 'Cơ chế'], [
  ['Người bệnh', '25.000đ / lượt khám', 'Thanh toán VietQR trong web; bác sĩ nhận 15.000đ, BriMed giữ 10.000đ (gồm GTGT). Token đã bỏ hoàn toàn'],
  ['Nhà thuốc — 6 tháng đầu', 'Tháng đầu miễn phí, sau đó 500.000đ/tháng', 'Chốt theo tháng bởi quản trị viên (nút chốt phí, chống trùng lặp theo tháng)'],
  ['Nhà thuốc — từ tháng 7', '900.000đ/tháng', 'Tự phân kỳ theo thời gian kích hoạt'],
  ['Hoa hồng tiền thuốc', 'Không thu', 'Bệnh nhân trả tiền thuốc trực tiếp tại quầy theo giá niêm yết'],
  ['Hoàn phí', '25.000đ', 'Tự động khi bệnh nhân huỷ lượt chưa xử lý (đã trả) hoặc quản trị viên đóng phiên kẹt'],
], [1900, 2500, 4388]));
B.push(noteBox('Nguyên tắc xuyên suốt: chỉ dịch vụ đã thanh toán mới vào hàng đợi bác sĩ; lượt hẹn được xử lý trước lượt thường; bác sĩ nhận thù lao như nhau dù kê đơn hay từ chối để giữ đơn thuốc khách quan; không thu phí khi không có bác sĩ trực tuyến và không có khung giờ đặt trước.'));

/* 3. BỆNH NHÂN */
B.push(h1('3. Hành trình Bệnh nhân'));
B.push(h2('3.1 Đăng ký và đăng nhập'));
B.push(body('Đăng ký bằng họ tên, số điện thoại 10 số và mật khẩu (tối thiểu 6 ký tự), vai trò mặc định bệnh nhân; hồ sơ sức khỏe được tạo sẵn với công tắc chia sẻ bật. Đăng nhập bằng số điện thoại, hệ thống ghi nhớ phiên và đưa về đúng cổng theo vai trò.'));
B.push(h2('3.2 Chọn bác sĩ và đặt lịch hẹn'));
B.push(tableTitle('Bảng 3.1 — Bước chọn bác sĩ (Bước 1 của màn tư vấn)'));
B.push(tableFrom(['Thành phần', 'Nội dung hiển thị'], [
  ['Danh sách trực tuyến', 'Ảnh đại diện thật, họ tên, chuyên khoa, nhãn "Chứng chỉ hành nghề đã xác minh" kèm số giấy phép, trạng thái trực tuyến cập nhật theo hoạt động thật (heartbeat 10 phút)'],
  ['Nhóm đặt trước', 'Bác sĩ ngoại tuyến có mở lịch hiển thị "Lịch trống sớm nhất" cho bệnh nhân đặt hẹn'],
  ['Hồ sơ bác sĩ (modal)', 'Ảnh lớn, chuyên khoa, giấy phép đã xác minh, thời gian phản hồi trung bình gần nhất'],
  ['Hành động', 'Đang trực tuyến: "Bắt đầu tư vấn ngay". Ngoại tuyến: chọn khung giờ mở lịch (xem giờ, số chỗ còn, ẩn khi đầy)'],
  ['Trường hợp không khả dụng', 'Thông báo rõ "Hiện không có bác sĩ trực tuyến", kèm thời gian phản hồi trung bình và hướng dẫn quay lại sau — chặn gửi yêu cầu ở phía máy chủ, không thu phí'],
]));
B.push(body('Cơ chế ghế đặt lịch: mỗi khung giờ có số chỗ giới hạn; lượt chưa thanh toán chỉ giữ ghế trong 15 phút, quá hạn ghế tự giải phóng và lượt chuyển trạng thái đã huỷ. Khi thanh toán muộn quá hạn, hệ thống từ chối và hướng dẫn đặt lại.'));
B.push(h2('3.3 Khai triệu chứng và sàng lọc'));
B.push(body('Sau khi chọn bác sĩ, bệnh nhân khai form theo Thông tư 30/2023: định danh (họ tên, điện thoại, CCCD), nhóm bệnh, mô tả triệu chứng, số ngày bị bệnh, sàng lọc an toàn (sốt kèm số ngày, khó thở, trẻ dưới 6 tuổi, thai kỳ), dị ứng và thuốc đang dùng, hai ô đồng ý bắt buộc. Năm dấu hiệu cờ đỏ chặn yêu cầu từ xa ngay từ giao diện và máy chủ, hướng dẫn khám trực tiếp và nhắc gọi 115 khi khẩn cấp — trường hợp này không phát sinh phí.'));
B.push(h2('3.4 Thanh toán phí khám'));
B.push(body('Sau khi gửi form, màn hình thanh toán hiển thị mã QR VietQR, số tiền 25.000đ và nội dung chuyển khoản riêng theo mã lượt khám. Bệnh nhân có thể thanh toán ngay hoặc để sau (lượt nằm ở mục "Yêu cầu tư vấn chờ thanh toán" trên tổng quan). Xác nhận nhiều lần không sinh giao dịch trùng. Máy chủ từ chối thanh toán nếu ghế đặt lịch đã quá 15 phút.'));
B.push(h2('3.5 Gặp bác sĩ'));
B.push(body('Khi bác sĩ bắt đầu cuộc gọi, banner nổi "Bác sĩ đang gọi bạn" xuất hiện ở mọi trang trong ứng dụng (không phụ thuộc trang đang mở), kèm tên bác sĩ và nút vào phòng gọi. Cuộc gọi video hai chiều qua LiveKit, giới hạn 7 phút mỗi lượt, hết giờ tự ngắt. Trường hợp mạng yếu, bác sĩ ghi nhận cuộc gọi điện thoại thay thế.'));
B.push(h2('3.6 Nhận đơn và gửi đến nhà thuốc'));
B.push(tableTitle('Bảng 3.2 — Gửi đơn đến nhà thuốc'));
B.push(tableFrom(['Bước', 'Hệ thống xử lý'], [
  ['Xem đơn', 'Mã quốc gia VN-Rx kèm chữ ký số, liều dùng từng vị thuốc; đơn bị từ chối hiển thị lý do chuyển khám'],
  ['Đề xuất nhà thuốc', 'Chấm điểm từng quầy theo tồn kho và giá: hiện "Đủ 3/3 thuốc - khoảng giá" cho quầy tốt nhất (gắn sao đề xuất), cảnh báo "Thiếu N thuốc" cho quầy thiếu'],
  ['Chặn gửi sai', 'Máy chủ từ chối gửi đến quầy không có bất kỳ vị thuốc nào của đơn, kèm gợi ý quầy thay thế'],
  ['Chọn cách nhận', 'Nhận tại quầy hoặc Giao tận nhà (nhập địa chỉ, bắt buộc khi chọn giao nhà)'],
  ['Theo dõi', 'Bốn trạng thái: Đã xác nhận - Đang chuẩn bị - Sẵn sàng nhận/Đang giao - Hoàn tất'],
]));
B.push(h2('3.7 Sau khám và tiện ích'));
B.push(bullet('Nhắc uống thuốc tự sinh cho từng vị thuốc khi bác sĩ kê đơn (Sáng/Trưa/Tối, kèm liều dùng) — bệnh nhân chỉnh sửa hoặc tắt được.'));
B.push(bullet('Huỷ yêu cầu/lịch hẹn trước khi bác sĩ xử lý: một nút, hoàn 25.000đ tự động nếu đã thanh toán, giải phóng ghế ngay.'));
B.push(bullet('Lịch sử khám, đơn thuốc, giao dịch; nút In/Lưu PDF lịch sử khám.'));
B.push(bullet('Hồ sơ sức khỏe với công tắc chia sẻ cho bác sĩ; tìm thuốc so sánh giá và tồn kho giữa các nhà thuốc.'));

/* 4. BÁC SĨ */
B.push(h1('4. Hành trình Bác sĩ'));
B.push(h2('4.1 Trực tuyến và hàng đợi'));
B.push(body('Đăng nhập chuyển trạng thái trực tuyến tự động; trạng thống duy trì theo hoạt động thật (heartbeat 10 phút) nên bệnh nhân không bao giờ thấy bác sĩ "trực tuyến ảo". Hàng đợi sắp theo thứ tự ưu tiên đúng thời gian: lượt hẹn đã đến giờ (+10 phút đệm) trước, sau đó lượt bệnh nhân chỉ định mình, cuối cùng lượt thường theo thời gian gửi. Lượt hẹn chưa đến giờ nằm ở nhóm "Lịch hẹn sắp tới" riêng, không làm nghẽn hàng đợi hiện tại.'));
B.push(body('Bảo vệ ca chỉ định: trong 5 phút đầu, chỉ bác sĩ được bệnh nhân chỉ định mới nhận được lượt; bác sĩ khác thấy tên người được chỉ định và thông báo chờ. Sau 5 phút lượt mở cho tất cả nếu bác sĩ chỉ định chưa nhận.'));
B.push(h2('4.2 Lịch trực (khung giờ nhận hẹn)'));
B.push(bullet('Mở khung giờ: thời gian bắt đầu, thời lượng 15-120 phút, số chỗ 1-10.'));
B.push(bullet('Xác nhận lịch hẹn: nút xác nhận trên từng khung, bệnh nhân thấy nhãn "Bác sĩ đã xác nhận lịch hẹn".'));
B.push(bullet('Huỷ khung giờ có người đặt: hệ thống yêu cầu xác nhận, sau đó các lượt đã đặt tự chuyển về hàng đợi thường (không mất phí, không mất chỗ), bệnh nhân thấy cập nhật khi mở ứng dụng.'));
B.push(h2('4.3 Khám và kê đơn'));
B.push(body('Bác sĩ mở hồ sơ lượt khám (form triệu chứng, sinh hiệu, hồ sơ bệnh nhân nếu được cấp quyền chia sẻ), gọi video tối đa 7 phút (hoặc ghi nhận gọi điện thoại khi thiếu điều kiện), sau đó quyết định: kê đơn hoặc từ chối kèm lý do bắt buộc. Kê đơn chọn thuốc từ danh mục chuẩn, đủ liều - cách dùng - thời gian - số lượng; đơn có kháng sinh bắt buộc xác nhận chỉ định vì tỷ lệ kháng sinh được giám sát. Đơn phát hành mang mã quốc gia và chữ ký số. Hệ thống tự sinh nhắc uống thuốc cho bệnh nhân ngay khi kê đơn thành công.'));
B.push(h2('4.4 Duyệt thay thế hoạt chất'));
B.push(body('Khi nhà thuốc yêu cầu đổi thuốc hết hàng, bác sĩ thấy thuốc gốc, lý do và danh sách phương án thay thế cùng hoạt chất/nhóm còn hàng tại quầy đó. Duyệt: đơn được cập nhật, ký lại chuỗi chữ ký mới, giá đơn hàng tính lại theo giá quầy. Từ chối: đơn giữ nguyên.'));
B.push(h2('4.5 Thu nhập'));
B.push(body('Card "Thu nhập của tôi" trên tổng quan hiển thị doanh thu tháng hiện tại (số lượt) và lũy kế; thù lao 15.000đ ghi nhận cho mọi lượt đã xử lý, kể cả lượt từ chối/chuyển khám.'));

/* 5. NHÀ THUỐC */
B.push(h1('5. Hành trình Nhà thuốc'));
B.push(h2('5.1 Trở thành đối tác'));
B.push(body('Điền form công khai (tên quầy, địa chỉ, chủ quầy, giấy phép, dược sĩ phụ trách, phần mềm, liên thông dữ liệu, gói quan tâm) → quản trị viên duyệt bằng nút "Duyệt và tạo tài khoản": hệ thống tự tạo hồ sơ nhà thuốc và tài khoản quản lý với mật khẩu một lần sử dụng, đánh dấu đăng ký đã chuyển đổi. Onboarding khép kín hoàn toàn trong hệ thống.'));
B.push(h2('5.2 Vận hành hằng ngày'));
B.push(bullet('Tổng quan: đơn mới, đang xử lý, hoàn tất hôm nay, tồn kho thấp.'));
B.push(bullet('Tồn kho: thêm thuốc từ danh mục chuẩn, đặt giá bán, ngưỡng cảnh báo.'));
B.push(bullet('Tiếp nhận đơn: nhập/quét mã VN-Rx; đối kho tự động từng vị (đủ - sắp hết - hết hàng); hết hàng hiển thị phương án thay thế cùng hoạt chất còn hàng và gửi yêu cầu đổi lên bác sĩ kê đơn.'));
B.push(bullet('Đơn hàng: báo giá từng dòng + phí giao hàng, xác nhận, bốn bước giao nhận đến hoàn tất (tự trừ tồn kho). Đơn giao tận nhà hiển thị địa chỉ bệnh nhân.'));
B.push(noteBox('Tại quầy, dược sĩ có thể thao tác hộ khách lớn tuổi trên chính thiết bị/phiên của bệnh nhân — không cần cài app; nguyên tắc này được ghi rõ ở màn đăng nhập.'));

/* 6. ADMIN */
B.push(h1('6. Hành trình Quản trị viên'));
B.push(tableTitle('Bảng 6.1 — Nhóm chức năng quản trị'));
B.push(tableFrom(['Nhóm', 'Chức năng'], [
  ['KPI tổng quan', 'Toa tháng, thời gian chờ, tỷ lệ từ chối, tỷ lệ kháng sinh (ngưỡng 30%), khách quay lại, doanh thu phí khám/B2B, thù lao bác sĩ, phút gọi video, cảnh báo "Ca chờ quá 15 phút" cần xử lý; nút chốt phí thuê bao tháng (500k/900k tự phân kỳ, chống trùng tháng)'],
  ['Phiên tư vấn', 'Danh sách phiên, tô đỏ ca kẹt >15 phút đã trả phí; hành động: Gắn lại cho bác sĩ khác hoặc Huỷ và hoàn tiền 25.000đ cho bệnh nhân'],
  ['Khách hàng quan tâm', 'Danh sách từ form trang chủ, trạng thái xử lý'],
  ['Đăng ký đối tác', 'Duyệt và cấp tài khoản nhà thuốc tự động (mật khẩu một lần)'],
  ['Tài khoản', 'Tạo tài khoản bác sĩ/bệnh nhân/nhà thuốc; bật tắt trực tuyến bác sĩ'],
  ['Danh mục', 'Thuốc (kèm cờ kháng sinh, giá tham chiếu) và danh mục bệnh khám từ xa'],
]));
B.push(body('Khôi phục dữ liệu mẫu nạp lại toàn bộ dữ liệu demo theo mô hình phí hiện hành nhưng luôn bảo toàn khách hàng quan tâm và đăng ký đối tác thu thập thật từ website.'));

/* 7. NGHIỆP VỤ ĐA VAI TRÒ */
B.push(h1('7. Các nghiệp vụ liên kết đa vai trò (chuỗi đầu cuối)'));
B.push(h2('7.1 Chuỗi đặt lịch hẹn (Bệnh nhân ↔ Bác sĩ)'));
B.push(tableFrom(['#', 'Bước', 'Vai trò', 'Hệ thống'], [
  ['1', 'Chọn bác sĩ, mở hồ sơ, chọn khung giờ', 'Bệnh nhân', 'Hiển thị chỗ còn, khóa 1 ghế tạm 15 phút'],
  ['2', 'Khai form + thanh toán 25.000đ', 'Bệnh nhân', 'Xác nhận thanh toán giữ ghế vĩnh viễn cho lượt; sinh ước lượng giờ tới lượt (vị trí × ~8 phút, tự cập nhật)'],
  ['3', 'Xác nhận lịch hẹn', 'Bác sĩ', 'Nút xác nhận trên Lịch trực; bệnh nhân thấy nhãn đã xác nhận'],
  ['4', 'Đến giờ hẹn (+10 phút đệm)', 'Hai bên', 'Lượt tự nhảy lên đầu hàng đợi của bác sĩ; hiển thị nhóm riêng nếu chưa đến giờ'],
  ['5', 'Bác sĩ bận / huỷ khung giờ', 'Hai bên', 'Huỷ khung có xác nhận: lượt hẹn chuyển về hàng đợi thường, không mất phí; bệnh nhân huỷ được hoàn 25.000đ tự động'],
], [500, 2600, 1300, 4388]));
B.push(h2('7.2 Chuỗi khám từ xa (Bệnh nhân ↔ Bác sĩ)'));
B.push(tableFrom(['#', 'Bước', 'Vai trò', 'Hệ thống'], [
  ['1', 'Gửi yêu cầu (chọn BS hoặc đặt lịch)', 'Bệnh nhân', 'Chặn khi không có bác sĩ trực tuyến/không có lịch; cờ đỏ chặn ngay'],
  ['2', 'Thanh toán VietQR 25.000đ', 'Bệnh nhân', 'Lượt chỉ vào hàng đợi khi đã thanh toán'],
  ['3', 'Nhận ca', 'Bác sĩ', 'Bảo vệ ca chỉ định 5 phút đầu; mọi thao tác của BS làm mới trạng thái trực tuyến'],
  ['4', 'Gọi video ≤7 phút', 'Hai bên', 'Banner "Bác sĩ đang gọi" toàn cục cho bệnh nhân; hết giờ tự ngắt; lưu thời lượng thật'],
  ['5', 'Kê đơn / từ chối', 'Bác sĩ', 'Ký số, kiểm soát kháng sinh, tự sinh nhắc uống; từ chối kèm lý do hiển thị cho bệnh nhân; thù lao 15.000đ ghi nhận cả hai nhánh'],
], [500, 2600, 1300, 4388]));
B.push(h2('7.3 Chuỗi cấp phát thuốc (Bệnh nhân ↔ Nhà thuốc ↔ Bác sĩ)'));
B.push(tableFrom(['#', 'Bước', 'Vai trò', 'Hệ thống'], [
  ['1', 'Gửi đơn đến quầy', 'Bệnh nhân', 'Đề xuất nhà thuốc theo tồn kho + giá; chặn quầy 0 thuốc; chọn nhận tại quầy hoặc giao tận nhà kèm địa chỉ'],
  ['2', 'Tiếp nhận theo mã', 'Nhà thuốc', 'Đối kho từng vị; hết hàng hiện phương án thay thế cùng hoạt chất'],
  ['3', 'Yêu cầu đổi hoạt chất', 'Nhà thuốc', 'Gửi lên bác sĩ kê đơn kèm lựa chọn còn hàng'],
  ['4', 'Duyệt thay thế', 'Bác sĩ', 'Cập nhật đơn, ký lại chữ ký, tính lại giá đơn hàng'],
  ['5', 'Báo giá → xác nhận → giao nhận', 'Nhà thuốc', 'Bốn trạng thái; hoàn tất tự trừ kho; tiền thuốc bệnh nhân trả trực tiếp, BriMed không hoa hồng'],
], [500, 2600, 1300, 4388]));
B.push(h2('7.4 Chuỗi tài chính (3 vai trò + Admin)'));
B.push(bullet('Dòng thu: 25.000đ/lượt (VietQR, tự xác nhận — đang chờ đối soát cổng payOS); thuê bao nhà thuốc chốt theo tháng bởi quản trị viên, tự phân kỳ 500.000đ/900.000đ.'));
B.push(bullet('Dòng chia: 15.000đ thù lao bác sĩ mỗi lượt xử lý (xem trực tiếp trong cổng bác sĩ); 10.000đ BriMed giữ.'));
B.push(bullet('Dòng hoàn: bệnh nhân huỷ trước xử lý hoặc quản trị viên đóng phiên kẹt → hoàn 25.000đ tự động, ghi giao dịch âm đầy đủ vết.'));
B.push(h2('7.5 Chuỗi vận hành và xử lý sự cố (Admin)'));
B.push(bullet('Ca đã trả phí chờ quá 15 phút: cảnh báo đỏ trên KPI và tab Phiên tư vấn; xử lý bằng gắn lại bác sĩ hoặc huỷ-hoàn tiền.'));
B.push(bullet('Bác sĩ quên đăng xuất: trạng thái trực tuyến tự tắt sau 10 phút không hoạt động.'));
B.push(bullet('Thông báo toàn cục: banner cuộc gọi đến (bệnh nhân), badge số lượt chờ (bác sĩ), badge đơn mới (nhà thuốc) — polling 15 giây trên khung ứng dụng chung.'));

/* 8. TRẠNG THÁI & NHÁNH NGOẠI LỆ */
B.push(h1('8. Ma trận trạng thái và nhánh ngoại lệ'));
B.push(tableTitle('Bảng 8.1 — Trạng thái chính'));
B.push(tableFrom(['Đối tượng', 'Trạng thái', 'Ý nghĩa'], [
  ['Tư vấn', 'pending / in_call / approved / rejected / cancelled', 'Chờ nhận - đang gọi - đã duyệt kê đơn - từ chối hoặc bệnh nhân huỷ'],
  ['Thanh toán', 'unpaid / paid / refunded', 'Chờ trả - đã trả 25.000đ - đã hoàn tiền'],
  ['Đơn thuốc', 'issued / rejected / dispensed', 'Hợp lệ chờ mua - bị từ chối - đã cấp phát'],
  ['Đơn hàng', 'confirmed / preparing / ready_or_shipping / completed', 'Bốn bước giao nhận'],
  ['Khung giờ', 'open / cancelled (ack)', 'Mở - đã huỷ (kèm cờ bác sĩ xác nhận lịch)'],
], [1500, 2800, 4488]));
B.push(tableTitle('Bảng 8.2 — Nhánh ngoại lệ đã đóng'));
B.push(tableFrom(['Tình huống', 'Hệ thống xử lý'], [
  ['Không có bác sĩ trực tuyến và không có lịch', 'Chặn gửi yêu cầu phía máy chủ (kể cả gọi API trực tiếp) — không thu phí'],
  ['Ghế đặt lịch quá 15 phút chưa thanh toán', 'Tự giải phóng ghế; từ chối thanh toán muộn với hướng dẫn đặt lại'],
  ['Bác sĩ khác nhận ca được chỉ định trong 5 phút đầu', 'Từ chối kèm tên bác sĩ được chỉ định'],
  ['Gửi đơn đến nhà thuốc không có thuốc', 'Từ chối kèm gợi ý quầy có hàng'],
  ['Bác sĩ huỷ khung giờ có người đặt', 'Xác nhận hai bước; lượt hẹn chuyển về hàng đợi thường, không mất phí'],
  ['Ca đã trả phí kẹt quá 15 phút', 'Cảnh báo đỏ admin; gắn lại bác sĩ hoặc huỷ-hoàn tiền ngay'],
  ['Đơn có kháng sinh', 'Bắt buộc bác sĩ xác nhận chỉ định; tỷ lệ giám sát trên KPI'],
], [3200, 5588]));
B.push(spacer());

/* 9. PHỤ LỤC */

/* 9. HƯỚNG DẪN KIỂM THỬ QUA GIAO DIỆN */

/* 9M. HƯỚNG DẪN KIỂM THỬ NGHIỆP VỤ ĐƠN VAI TRÒ */
B.push(h1('9A. Hướng dẫn kiểm thử nghiệp vụ đơn vai trò'));
B.push(body('Các kịch bản ở mục 9 đều cần ít nhất hai vai trò phối hợp. Mục này bổ sung các nghiệp vụ một vai trò tự hoàn thiện — người kiểm thử chỉ cần một tài khoản, thao tác và đối chiếu kết quả ngay trong cổng của chính mình.'));

B.push(h2('9A.1 Bệnh nhân — hồ sơ, tìm thuốc, nhắc uống, lịch sử'));
B.push(tableFrom(['Mã', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['P1', 'Đăng nhập bệnh nhân → Hồ sơ sức khỏe → sửa tiền sử, dị ứng, chỉ số → Lưu; gạt công tắc chia sẻ', 'Dữ liệu lưu và hiển thị lại đúng; công tắc trạng thái bật/tắt được ghi nhận'],
  ['P2', 'Tìm thuốc → gõ "paracetamol"', 'Danh sách thuốc kèm hoạt chất; mỗi thuốc hiện bảng so sánh giá và tồn kho từng nhà thuốc, gắn nhãn còn hàng/sắp hết/hết hàng'],
  ['P3', 'Lịch sử & Nhắc uống → thêm nhắc tay: chọn thuốc, buổi Sáng/Trưa/Tối → Lưu; sửa buổi; tắt hoạt động; xoá', 'Nhắc hiện đúng các buổi đã chọn; tắt thì không còn tính là đang hoạt động; xoá biến mất khỏi danh sách'],
  ['P4', 'Lịch sử & Nhắc uống → bấm "In / Lưu PDF lịch sử khám"', 'Mở hộp thoại in của trình duyệt với bản trình bày sạch (ẩn các nút lệnh), có thể chọn Lưu PDF'],
  ['P5', 'Tổng quan → mục Lịch sử giao dịch (trong trang Ví/giao dịch nếu có) hoặc soát từng phiên', 'Mọi lượt 25.000đ, khoản hoàn -25.000đ đều có dòng riêng, mô tả rõ ràng'],
  ['P6', 'Đăng xuất → đăng nhập lại', 'Về đúng cổng bệnh nhân; dữ liệu và phiên phiên bản mới nhất giữ nguyên'],
], [600, 3600, 4588]));

B.push(h2('9A.2 Bác sĩ — hồ sơ bệnh nhân đã cấp quyền, đơn của tôi'));
B.push(tableFrom(['Mã', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['D1', 'Hồ sơ BN (tab Hồ sơ bệnh nhân) → mở một bệnh nhân từng khám với mình', 'Chỉ hiện bệnh nhân có lượt do mình xử lý; bệnh nhân chưa cấp quyền chia sẻ hồ sơ hiển thị trạng thái khoá'],
  ['D2', 'Đơn thuốc → tab Đơn của tôi', 'Danh sách đơn mình kê: mã VN-Rx, trạng thái, thuốc; không thấy đơn của bác sĩ khác'],
  ['D3', 'Tổng quan → card "Thu nhập của tôi"', 'Số tháng hiện tại + lũy kế khớp với số lượt đã xử lý (kể cả lượt từ chối vẫn tính thù lao)'],
  ['D4', 'Lịch trực → mở khung giờ không ai đặt → bấm xoá', 'Xoá ngay không cần xác nhận (không có ảnh hưởng bên thứ ba)'],
], [600, 3600, 4588]));

B.push(h2('9A.3 Nhà thuốc — tồn kho và danh mục'));
B.push(tableFrom(['Mã', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['S1', 'Tồn kho → Thêm thuốc từ danh mục → đặt giá bán, số lượng → Lưu', 'Thuốc xuất hiện trong kho của mình; các nhà thuốc khác không thấy thay đổi'],
  ['S2', 'Sửa giá/số lượng/ngưỡng cảnh báo → Lưu; nhập số lượng dưới ngưỡng', 'Giá và số lượng cập nhật; thuốc rơi xuống danh sách cảnh báo tồn thấp ở Tổng quan'],
  ['S3', 'Xoá một mục kho', 'Mục biến mất; đơn hàng cũ không bị ảnh hưởng'],
  ['S4', 'Tổng quan', 'Số đơn mới/đang xử lý/hoàn tất hôm nay đúng với tab Đơn hàng; danh sách tồn kho thấp khớp kết quả S2'],
], [600, 3600, 4588]));

B.push(h2('9A.4 Quản trị viên — danh mục và khách hàng quan tâm'));
B.push(tableFrom(['Mã', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['M1', 'Danh mục thuốc → Thêm thuốc mới (tên, hoạt chất, cờ kháng sinh, giá tham chiếu)', 'Thuốc xuất hiện và lập tức dùng được khi bác sĩ kê đơn và nhà thuốc thêm kho'],
  ['M2', 'Khách hàng quan tâm → đổi trạng thái một khách từ Mới → Đã liên hệ → Đã dùng dịch vụ', 'Nhãn trạng thái đổi đúng; bộ lọc/danh sách phản ánh ngay'],
  ['M3', 'Tài khoản → bấm chuyển trực tuyến một bác sĩ', 'Bệnh nhân mở bước chọn bác sĩ thấy bác sĩ này trực tuyến trong ~10 phút (kể cả khi bác sĩ không thao tác)'],
  ['M4', 'Danh mục bệnh', 'Hiển thị 11 nhóm bệnh được khám từ xa theo TT 30/2023 và danh sách loại trừ — tham chiếu tra cứu'],
], [600, 3600, 4588]));

B.push(noteBox('Các mã kiểm thử P/D/S/M ghi kết quả như mục 9: Đạt/Không đạt kèm ảnh chụp. Nghiệp vụ đơn vai trò là điều kiện nền — nếu một mục FAIL, khoá kịch bản đa vai trò tương ứng trước khi kiểm tiếp để tránh nhầm nguồn lỗi.'));

B.push(h1('9. Hướng dẫn kiểm thử nghiệp vụ qua giao diện'));
B.push(body('Phần này là kịch bản kiểm thử chấp nhận (UAT) cho người dùng thật: mỗi kịch bản thực hiện trực tiếp trên giao diện brimed.id.vn, ghi kết quả thực tế so với kết quả kỳ vọng. Chuẩn bị: (1) hai cửa sổ trình duyệt riêng biệt — một cho bệnh nhân, một cho bác sĩ/nhà thuốc — để nhìn thấy cùng lúc hai vai trò; (2) cho phép sử dụng camera và micro khi trình duyệt hỏi (cần cho cuộc gọi video); (3) sử dụng tài khoản mẫu ở mục 10.1; (4) mỗi vòng kiểm thử nên bắt đầu bằng "Khôi phục dữ liệu mẫu" của quản trị viên để số liệu về trạng thái chuẩn.'));

B.push(h2('9.1 Kịch bản A — Đặt lịch hẹn và xác nhận (Bệnh nhân ↔ Bác sĩ)'));
B.push(tableFrom(['Bước', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['A1', 'Bệnh nhân đăng nhập, mở mục "Toa thuốc nhanh tại quầy"', 'Bước 1 hiện danh sách bác sĩ trực tuyến có ảnh, chuyên khoa, nhãn "Chứng chỉ hành nghề đã xác minh"'],
  ['A2', 'Bấm một bác sĩ đang trực tuyến', 'Mở hồ sơ: giấy phép, thời gian phản hồi trung bình, nút "Bắt đầu tư vấn ngay"'],
  ['A3', 'Ở cửa sổ bác sĩ: mục "Lịch trực" → chọn giờ tương lai gần → Mở lịch (30 phút, 1 chỗ)', 'Khung giờ xuất hiện trong danh sách, nhãn "còn 1/1 chỗ", nút "Xác nhận"'],
  ['A4', 'Bệnh nhân: chọn bác sĩ kia (giờ đã ngoại tuyến sau khi thôi thao tác ~10 phút) → hồ sơ → khung giờ vừa mở', 'Danh sách khung giờ hiện giờ hẹn và số chỗ còn; chọn một khung rồi "Tiếp tục với lịch hẹn đã chọn"'],
  ['A5', 'Khai form đủ trường + 2 ô đồng ý → "Gửi cho BS…"', 'Màn thanh toán hiện QR VietQR 25.000đ, nội dung chuyển khoản BRIMED kèm mã lượt; banner xác nhận lịch hẹn kèm giờ dự kiến tới lượt'],
  ['A6', 'Bấm "Tôi đã chuyển khoản — Xác nhận"', 'Thông báo thành công; bệnh nhân về trang Đơn thuốc; dashboard có mục "Lịch hẹn sắp tới"'],
  ['A7', 'Cửa sổ bác sĩ: Lịch trực → bấm "Xác nhận" trên khung vừa đặt', 'Nhãn chuyển "Đã xác nhận"; bên bệnh nhân, mục Lịch hẹn hiện thêm nhãn "BS đã xác nhận lịch"'],
  ['A8', 'Bệnh nhân: bấm "Huỷ" trên lịch hẹn', 'Xác nhận → thông báo đã huỷ và hoàn 25.000đ; lịch hẹn biến mất; giao dịch hiện khoản hoàn -25.000đ'],
], [600, 3400, 4788]));

B.push(h2('9.2 Kịch bản B — Khám ngay có gọi video (Bệnh nhân ↔ Bác sĩ)'));
B.push(tableFrom(['Bước', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['B1', 'Bệnh nhân chọn bác sĩ trực tuyến → "Bắt đầu tư vấn ngay" → khai form → gửi → thanh toán QR', 'Lượt vào hàng đợi (không có lịch hẹn)'],
  ['B2', 'Cửa sổ bác sĩ: Hàng đợi hiện lượt mới kèm nhãn "Bệnh nhân chỉ định bạn"', 'Lượt đứng đúng nhóm ưu tiên (chỉ định trước walk-in)'],
  ['B3', 'Mở lượt → bấm "Gọi video bệnh nhân tại quầy"', 'Phòng gọi hiện đồng hồ 00:00/07:00; trạng thái lượt chuyển "Đang gọi"'],
  ['B4', 'Bệnh nhân: rời sang một trang bất kỳ (vd. Đơn thuốc) và chờ ≤15 giây', 'Banner nổi "Bác sĩ đang gọi bạn" xuất hiện ở mọi trang, kèm tên bác sĩ; bấm vào quay về dashboard và vào phòng'],
  ['B5', 'Hai bên nói chuyện (cho phép camera/mic), một bên bấm rời phòng', 'Cuộc gọi kết thúc; bác sĩ thấy thời lượng thật được ghi; đóng chuông 7 phút tự ngắt nếu để hết giờ'],
  ['B6', 'Bác sĩ: "Tiến hành kê đơn" → chọn thuốc, điền liều dùng → xác nhận', 'Đơn phát hành mã VN-Rx kèm chữ ký số; bệnh nhân thấy đơn ở "Đơn thuốc của tôi"; mục Nhắc uống tự sinh theo từng vị thuốc Sáng/Trưa/Tối'],
], [600, 3400, 4788]));

B.push(h2('9.3 Kịch bản C — Gửi đơn, đề xuất nhà thuốc, giao nhận (Bệnh nhân ↔ Nhà thuốc ↔ Bác sĩ)'));
B.push(tableFrom(['Bước', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['C1', 'Bệnh nhân: Đơn thuốc → "Gửi đơn đến quầy nhà thuốc"', 'Danh sách nhà thuốc có xếp hạng: sao đề xuất cho quầy "Đủ N/N thuốc · khoảng giá"; quầy thiếu gắn "Thiếu N thuốc"'],
  ['C2', 'Chọn "Giao tận nhà", nhập địa chỉ → Xác nhận', 'Đơn hàng tạo với trạng thái Đã xác nhận, hiển thị địa chỉ giao'],
  ['C3', 'Cửa sổ nhà thuốc: Đơn hàng → mở đơn vừa nhận', 'Hiện phương thức Giao tận nhà + địa chỉ; các dòng thuốc kèm giá của quầy'],
  ['C4', 'Báo giá (điều chỉnh nếu muốn) → Xác nhận đơn → tiến trạng thái đến Hoàn tất', 'Bốn trạng thái lần lượt: Đang chuẩn bị → Sẵn sàng nhận/Đang giao → Hoàn tất; tồn kho tự trừ'],
  ['C5', '(Tuỳ chọn) Nhà thuốc: Tiếp nhận một đơn có thuốc hết hàng → chọn thuốc thay thế → gửi yêu cầu đổi', 'Yêu cầu tới bác sĩ; bác sĩ duyệt trong mục duyệt thay thế → đơn cập nhật và giá tính lại'],
], [600, 3400, 4788]));

B.push(h2('9.4 Kịch bản D — Giám sát và xử lý sự cố (Quản trị viên)'));
B.push(tableFrom(['Bước', 'Thao tác trên giao diện', 'Kết quả kỳ vọng'], [
  ['D1', 'Admin: tab Tổng quan', 'KPI đầy đủ; nếu có ca đã trả phí chờ >15 phút, thẻ đỏ "Ca chờ quá 15 phút" xuất hiện'],
  ['D2', 'Tab "Phiên tư vấn" → tìm ca đỏ → "Gắn cho bác sĩ…" chọn một bác sĩ', 'Ca được gắn lại; bác sĩ đó thấy nhãn chỉ định trong hàng đợi'],
  ['D3', 'Với ca không cứu được: "Huỷ & hoàn tiền"', 'Ca đóng, bệnh nhân nhận hoàn 25.000đ (xem giao dịch bệnh nhân)'],
  ['D4', 'Tab "Đăng ký đối tác" → một đăng ký mới → "Duyệt & tạo tài khoản"', 'Thông báo tạo nhà thuốc + tài khoản kèm mật khẩu một lần; trạng thái chuyển "Đã tạo tài khoản nhà thuốc"'],
  ['D5', 'Tab "Tài khoản" → "+ Tạo tài khoản" → vai trò Bác sĩ, nhập tên/SĐT/chuyên khoa/giấy phép → Tạo', 'Tài khoản tạo thành công, mật khẩu hiển thị đúng một lần; đăng nhập được ngay'],
  ['D6', 'Tổng quan → "Chốt phí thuê bao tháng này" → xác nhận → bấm lần 2', 'Lần 1 chốt 500k/900k từng nhà thuốc; lần 2 toàn bộ "đã chốt" — không trùng'],
], [600, 3400, 4788]));

B.push(h2('9.5 Kịch bản E — Nhánh ngoại lệ kiểm tra nhanh'));
B.push(tableFrom(['Cách tạo tình huống', 'Kết quả kỳ vọng'], [
  ['Không để bác sĩ nào thao tác quá 10 phút rồi bệnh nhân mở bước chọn bác sĩ', 'Danh sách trống trực tuyến; nếu không có lịch: thông báo "Hiện không có bác sĩ trực tuyến…", không thể gửi form'],
  ['Đặt lịch 1 chỗ nhưng không thanh toán, chờ >15 phút rồi bấm Thanh toán', 'Từ chối "Ghế đặt lịch đã hết hạn…", lượt tự huỷ'],
  ['Bệnh nhân chỉ định bác sĩ A; ngay sau đó đăng nhập bác sĩ B mở cùng lượt', 'Bác sĩ B bị chặn kèm tên bác sĩ được chỉ định (5 phút đầu)'],
  ['Chọn thủ công nhà thuốc không có thuốc (bỏ qua đề xuất) rồi Xác nhận', 'Bị từ chối kèm gợi ý quầy có hàng'],
  ['Bác sĩ huỷ khung giờ đang có người đặt', 'Phải xác nhận lần 2; sau đó lượt hẹn về hàng đợi thường, bệnh nhân không mất phí'],
], [4300, 4488]));
B.push(noteBox('Ghi kết quả: với mỗi dòng kỳ vọng, đánh Đạt/Không đạt và chụp màn hình khi Không đạt. Sau vòng kiểm thử, quản trị viên nên bấm "Khôi phục dữ liệu mẫu" để hệ thống trở trạng thái chuẩn (khách hàng quan tâm và đăng ký đối tác thật luôn được bảo toàn).'));

B.push(h1('10. Phụ lục'));
B.push(h2('10.1 Tài khoản mẫu'));
B.push(tableFrom(['Vai trò', 'Số điện thoại', 'Mật khẩu'], [
  ['Quản trị viên', '0900000001', 'admin@2026 (nên đổi trước khi vận hành thật)'],
  ['Bệnh nhân', '0901234567', '123456'],
  ['Bác sĩ', '0908888881', '123456'],
  ['Nhà thuốc', '0907777771', '123456'],
], [2200, 2400, 4188]));
B.push(h2('10.2 Giới hạn hiện hành cần biết'));
B.push(bullet('Thanh toán VietQR hiện là xác nhận của bệnh nhân, chưa đối soát tự động với cổng — đang chờ kích hoạt payOS.'));
B.push(bullet('Thông báo là polling 15 giây trong web; chưa có đẩy Zalo/SMS (mọi nội dung trên site chỉ cam kết những gì có thật).'));
B.push(bullet('Cuộc gọi video giới hạn 7 phút phía ứng dụng; máy chủ cấp token 15 phút cho phiên.'));
B.push(bullet('Dược sĩ thao tác hộ bệnh nhân tại quầy dựa trên phiên của bệnh nhân trên thiết bị chung — không có chế độ tài khoản "quầy thay mặt".'));

/* ═════════ DOCUMENT ═════════ */
const pageFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080', font: FONT })] })] });
const pageHeader = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } }, children: [new TextRun({ text: 'BriMed — Hành trình người dùng & nghiệp vụ đa vai trò', size: 16, color: '909090', font: FONT })] })] });

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22, color: '1A2B40' }, paragraph: { spacing: { line: 312 } } } } },
  features: { updateFields: true },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: 'Hành trình người dùng và nghiệp vụ đa vai trò BriMed',
        subtitle: 'Toàn bộ luồng theo từng vai trò và các chuỗi nghiệp vụ liên kết đầu cuối',
        englishLabel: 'USER JOURNEY & CROSS-ROLE WORKFLOWS',
        metaLines: [
          'Phiên bản hệ thống: main 320e76b — brimed.id.vn',
          'Phạm vi: Bệnh nhân · Bác sĩ · Nhà thuốc · Quản trị viên · Khách truy cập',
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
  fs.writeFileSync('BriMed-HanhTrinh-NguoiDung-Va-Nghiep-Vu-Da-Vai-Tro.docx', buf);
  console.log('OK', Math.round(buf.length / 1024) + ' KB');
});
