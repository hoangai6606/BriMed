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

