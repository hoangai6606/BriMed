import { useEffect, useState } from 'react'
import { Package, Plus, Save, Trash2, Database, Search } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { Modal, PageLoading } from '../../components/common/Misc'
import { useUi } from '../../store/ui'

export default function PharmacyInventory() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [catalog, setCatalog] = useState<any[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editVal, setEditVal] = useState({ sell_price: 0, stock: 0, low_stock_threshold: 10 })
  const [newItem, setNewItem] = useState({ medicine_id: '' as number | '', sell_price: 0, stock: 0, low_stock_threshold: 10 })
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)

  const load = () => api('/pharmacy/inventory').then((d) => setRows(d.inventory)).catch(() => setRows([]))
  useEffect(() => {
    load()
    api('/pharmacy/catalog').then((d) => setCatalog(d.medicines)).catch(() => {})
  }, [])

  const startEdit = (r: any) => {
    setEditId(r.id)
    setEditVal({ sell_price: r.sell_price, stock: r.stock, low_stock_threshold: r.low_stock_threshold })
  }

  const saveEdit = async () => {
    if (!editId) return
    setBusy(true)
    try {
      await api(`/pharmacy/inventory/${editId}`, { method: 'PUT', body: JSON.stringify(editVal) })
      toast('Đã cập nhật tồn kho.', 'success')
      setEditId(null)
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const addItem = async () => {
    if (!newItem.medicine_id) {
      toast('Chọn thuốc từ danh mục chuẩn.', 'error')
      return
    }
    setBusy(true)
    try {
      await api('/pharmacy/inventory', { method: 'POST', body: JSON.stringify(newItem) })
      toast('Đã thêm thuốc vào kho.', 'success')
      setAddOpen(false)
      setNewItem({ medicine_id: '', sell_price: 0, stock: 0, low_stock_threshold: 10 })
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (r: any) => {
    if (!confirm(`Xóa ${r.medicine_name} khỏi kho?`)) return
    await api(`/pharmacy/inventory/${r.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  if (!rows) return <PageLoading />

  return (
    <div className="space-y-4">
      <SeoMeta title="Quản lý danh mục thuốc – Nhà thuốc BriMed" />
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-bluedark">Danh mục thuốc & tồn kho</h1>
        <button onClick={() => setAddOpen(true)} className="btn-pink !min-h-[40px] !text-[13.5px]">
          <Plus size={16} /> Thêm thuốc
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 text-left text-[11.5px] uppercase text-slate-400">
                <th className="px-3.5 py-2.5">Thuốc / hoạt chất</th>
                <th className="px-2 py-2.5">Loại</th>
                <th className="px-2 py-2.5 text-right">Giá bán</th>
                <th className="px-2 py-2.5 text-right">Tồn</th>
                <th className="px-2 py-2.5 text-center">Trạng thái</th>
                <th className="px-3 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const editing = editId === r.id
                const low = r.stock <= r.low_stock_threshold
                return (
                  <tr key={r.id} className={editing ? 'bg-lightblue/20' : ''}>
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-700">{r.medicine_name}</div>
                      <div className="text-[11.5px] text-slate-400">{r.active_ingredient} · {r.pack_size}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`badge ${r.category === 'rx' ? 'bg-lightpink text-pink-dark' : 'bg-slate-100 text-slate-500'}`}>
                        {r.category === 'rx' ? 'Kê đơn' : 'OTC'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold text-bluedark">
                      {editing ? (
                        <input type="number" className="input !min-h-[34px] !w-24 text-right" value={editVal.sell_price} onChange={(e) => setEditVal({ ...editVal, sell_price: Number(e.target.value) })} />
                      ) : fmtVnd(r.sell_price)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold">
                      {editing ? (
                        <input type="number" className="input !min-h-[34px] !w-20 text-right" value={editVal.stock} onChange={(e) => setEditVal({ ...editVal, stock: Number(e.target.value) })} />
                      ) : (
                        <span className={r.stock <= 0 ? 'text-redflag-fg' : low ? 'text-amber-600' : 'text-slate-700'}>{r.stock}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {editing ? (
                        <input type="number" className="input !min-h-[34px] !w-16 text-center" value={editVal.low_stock_threshold} onChange={(e) => setEditVal({ ...editVal, low_stock_threshold: Number(e.target.value) })} title="Ngưỡng cảnh báo" />
                      ) : (
                        <span className={`badge ${r.stock <= 0 ? 'bg-redflag-bg text-redflag-fg' : low ? 'bg-amber-100 text-amber-700' : 'bg-mint-bg text-mint-fg'}`}>
                          {r.stock <= 0 ? 'Hết hàng' : low ? 'Sắp hết' : 'Đủ hàng'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {editing ? (
                        <>
                          <button onClick={saveEdit} disabled={busy} className="btn-primary !min-h-[34px] !px-2.5 !text-[12px] mr-1"><Save size={14} /> Lưu</button>
                          <button onClick={() => setEditId(null)} className="btn-ghost !min-h-[34px] !px-2.5 !text-[12px]">Hủy</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)} className="btn-ghost !min-h-[34px] !px-2.5 !text-[12px] mr-1">Sửa</button>
                          <button onClick={() => removeItem(r)} className="text-slate-300 hover:text-redflag-fg p-1.5" aria-label={`Xóa ${r.medicine_name}`}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[12.5px] text-slate-400 flex items-center gap-1.5">
        <Database size={14} /> Trạng thái liên thông Cơ sở dữ liệu Dược quốc gia được đồng bộ theo từng thuốc trong kho (bắt buộc từ 01/01/2026).
      </p>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Thêm thuốc vào kho">
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="inv-med">Thuốc (danh mục chuẩn BriMed)</label>
            <select
              id="inv-med"
              className="input"
              value={newItem.medicine_id}
              onChange={(e) => {
                const id = Number(e.target.value)
                const m = catalog.find((x) => x.id === id)
                setNewItem({ ...newItem, medicine_id: id, sell_price: m?.reference_price || 0 })
              }}
            >
              <option value="">— Chọn thuốc —</option>
              {catalog.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.active_ingredient}) · gợi ý giá {fmtVnd(m.reference_price)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="label" htmlFor="inv-price">Giá bán (đ)</label>
              <input id="inv-price" type="number" className="input" value={newItem.sell_price} onChange={(e) => setNewItem({ ...newItem, sell_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label" htmlFor="inv-stock">Tồn đầu</label>
              <input id="inv-stock" type="number" className="input" value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label" htmlFor="inv-th">Ngưỡng thấp</label>
              <input id="inv-th" type="number" className="input" value={newItem.low_stock_threshold} onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: Number(e.target.value) })} />
            </div>
          </div>
          <button onClick={addItem} disabled={busy} className="btn-pink w-full"><Package size={16} /> {busy ? 'Đang thêm…' : 'Thêm vào kho'}</button>
        </div>
      </Modal>
    </div>
  )
}
