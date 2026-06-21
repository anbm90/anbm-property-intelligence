'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function TradeRatesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<any[]>([])
  const [rates, setRates] = useState<any[]>([])
  const [tradespeople, setTradespeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTrade, setNewTrade] = useState({ name: '', category_id: '', phone: '', relationship: 'preferred_sub', priority: '2', notes: '' })

  useEffect(() => {
    const load = async () => {
      const [catRes, rateRes, tradeRes] = await Promise.all([
        supabase.from('trade_categories').select('*').order('sort_order'),
        supabase.from('trade_rates').select('*, trade_categories(name)'),
        supabase.from('tradespeople').select('*, trade_categories(name)').eq('is_active', true).order('priority'),
      ])
      setCategories(catRes.data ?? [])
      setRates(rateRes.data ?? [])
      setTradespeople(tradeRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rates.filter(r => {
    const matchCat = selectedCat === 'all' || r.category_id === selectedCat
    const matchSearch = !search || r.item_name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const addTrade = async () => {
    if (!newTrade.name || !newTrade.category_id) return
    await supabase.from('tradespeople').insert({ ...newTrade, priority: Number(newTrade.priority), is_active: true, typically_available: true, lead_time_days: 0 })
    const { data } = await supabase.from('tradespeople').select('*, trade_categories(name)').eq('is_active', true).order('priority')
    setTradespeople(data ?? [])
    setShowAdd(false)
    setNewTrade({ name: '', category_id: '', phone: '', relationship: 'preferred_sub', priority: '2', notes: '' })
  }

  const fmtMoney = (n: number) => '$' + n.toLocaleString()

  const relColor = (r: string) => {
    if (r === 'family') return { bg: '#dcfce7', color: '#166534' }
    if (r === 'mate') return { bg: '#dbeafe', color: '#1e40af' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  const inp = { className: 'form-input' }
  const lbl = { className: 'form-label' }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Trade rates</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Your full rates book — team + 2026 NSW market rates</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add tradesperson</button>
        </div>

        {/* Your team */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Your team</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {tradespeople.filter(t => ['family','mate'].includes(t.relationship)).map(t => {
              const rc = relColor(t.relationship)
              return (
                <div key={t.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: rc.bg, color: rc.color }}>{t.relationship}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{t.trade_categories?.name}</div>
                  {t.phone && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{t.phone}</div>}
                  {t.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                </div>
              )
            })}
          </div>

          {tradespeople.filter(t => !['family','mate'].includes(t.relationship)).length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: 13, margin: '14px 0 8px', color: '#666' }}>Other trades</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {tradespeople.filter(t => !['family','mate'].includes(t.relationship)).map(t => (
                  <div key={t.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t.trade_categories?.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add tradesperson */}
        {showAdd && (
          <div className="card" style={{ border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add tradesperson</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label {...lbl}>Name *</label><input {...inp} value={newTrade.name} onChange={e => setNewTrade(p => ({ ...p, name: e.target.value }))} /></div>
              <div>
                <label {...lbl}>Trade *</label>
                <select {...inp} value={newTrade.category_id} onChange={e => setNewTrade(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Select</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label {...lbl}>Phone</label><input {...inp} value={newTrade.phone} onChange={e => setNewTrade(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label {...lbl}>Relationship</label>
                <select {...inp} value={newTrade.relationship} onChange={e => setNewTrade(p => ({ ...p, relationship: e.target.value }))}>
                  {['family','mate','trusted_sub','preferred_sub','backup','one_off'].map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><label {...lbl}>Priority (1=first call)</label><input {...inp} type="number" min="1" max="5" value={newTrade.priority} onChange={e => setNewTrade(p => ({ ...p, priority: e.target.value }))} /></div>
              <div><label {...lbl}>Notes</label><input {...inp} value={newTrade.notes} onChange={e => setNewTrade(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={addTrade}>Save</button>
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Rates table */}
        <div className="card">
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input className="form-input" style={{ width: 220 }} placeholder="Search rates..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-input" style={{ width: 220 }} value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>{filtered.length} items</span>
          </div>
          {loading ? <div style={{ color: '#888' }}>Loading...</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Low</th>
                  <th>Mid</th>
                  <th>High</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, color: '#888' }}>{r.trade_categories?.name}</td>
                    <td style={{ fontWeight: 500 }}>{r.item_name}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>per {r.unit}</td>
                    <td style={{ color: '#166534' }}>{fmtMoney(r.rate_low)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtMoney(r.rate_mid)}</td>
                    <td style={{ color: '#991b1b' }}>{fmtMoney(r.rate_high)}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}