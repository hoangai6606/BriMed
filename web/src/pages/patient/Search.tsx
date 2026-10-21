import { useEffect, useState } from 'react'
import { Search as SearchIcon, MapPin, Pill, PackageSearch } from 'lucide-react'
import { SeoMeta } from '../../components/common/SeoMeta'
import { api, fmtVnd } from '../../api/client'
import { EmptyState, PageLoading } from '../../components/common/Misc'

const STOCK_CLS: Record<string, string> = {
  'còn hàng': 'bg-mint-bg text-mint-fg',
  'sắp hết': 'bg-amber-100 text-amber-700',
  'hết hàng': 'bg-redflag-bg text-redflag-fg',
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [area, setArea] = useState('Gò Vấp')
  const [data, setData] = useState<any[] | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const load = (query: string) => {
    setData(null)
    api(`/catalog/medicines?q=${encodeURIComponent(query)}&area=${encodeURIComponent(area)}`)
      .then((d) => setData(d.medicines))
      .catch(() => setData([]))
  }

  useEffect(() => {
    load('')
  }, [])

  return (
    <div className="space-y-4 max-w-2xl">
      <SeoMeta title="Tìm thuốc / Nhà thuốc – BriMed" />
      <h1 className="text-[20px] font-extrabold text-bluedark">Tìm thuốc & nhà thuốc</h1>

      <form
        className="card p-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          load(q)
        }}
      >
        <div className="relative flex-1">
          <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-9"
            placeholder="Tên thuốc hoặc hoạt chất (VD: Paracetamol, Efferalgan…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm thuốc"
          />
        </div>
        <select className="input !w-32" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Khu vực">
          <option value="">Tất cả</option>
          <option value="Gò Vấp">Gò Vấp</option>
        </select>
        <button className="btn-primary !px-4" type="submit">Tìm</button>
      </form>

      {data === null ? (
        <PageLoading />
      ) : data.length === 0 ? (
        <EmptyState icon={<PackageSearch size={24} />} title="Không tìm thấy thuốc phù hợp" desc="Nhập tên khác hoặc hoạt chất (VD: Paracetamol)." />
      ) : (
        <div className="space-y-3">
          {data.map((m) => {
            const inStock = m.availability.filter((a: any) => a.stock > 0)
            return (
              <article key={m.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-extrabold text-[15.5px] text-bluedark flex items-center gap-2">
                      <Pill size={17} className="text-primary" /> {m.name}
                    </h2>
                    <div className="text-[12.5px] text-slate-500 mt-0.5">
                      Hoạt chất: <strong>{m.active_ingredient}</strong> · {m.pack_size}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <span className={`badge ${m.category === 'rx' ? 'bg-lightpink text-pink-dark' : 'bg-slate-100 text-slate-600'}`}>
                        {m.category === 'rx' ? 'Kê đơn (Rx)' : 'Không kê đơn (OTC)'}
                      </span>
                      {m.is_antibiotic && <span className="badge bg-redflag-bg text-redflag-fg">Kháng sinh</span>}
                      <span className="badge bg-lightblue text-bluedark">{m.med_group}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11.5px] text-slate-400">Giá thấp nhất</div>
                    <div className="text-[16px] font-extrabold text-primary">{fmtVnd(m.min_price)}</div>
                    <div className="text-[11px] text-slate-400">tại {inStock.length} nhà thuốc</div>
                  </div>
                </div>

                <button
                  onClick={() => setOpenId(openId === m.id ? null : m.id)}
                  className="mt-2.5 text-[13px] font-bold text-primary hover:underline"
                >
                  {openId === m.id ? 'Ẩn' : 'So sánh giá & tồn kho tại các nhà thuốc'}
                </button>

                {openId === m.id && (
                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-[11.5px] text-slate-400 uppercase border-b border-slate-100">
                          <th className="py-1.5 pr-2">Nhà thuốc</th>
                          <th className="py-1.5 pr-2">Giá bán</th>
                          <th className="py-1.5">Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {m.availability.map((a: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2 pr-2">
                              <div className="font-semibold text-slate-700">{a.pharmacy_name}</div>
                              <div className="text-[11.5px] text-slate-400 flex items-center gap-1"><MapPin size={11} /> {a.address}</div>
                            </td>
                            <td className="py-2 pr-2 font-bold text-bluedark">{fmtVnd(a.sell_price)}</td>
                            <td className="py-2"><span className={`badge ${STOCK_CLS[a.status]}`}>{a.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
