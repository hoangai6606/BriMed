export const fmtVnd = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('vi-VN').format(Math.round(v)) + 'đ'
