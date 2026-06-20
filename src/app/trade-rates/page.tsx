'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCurrency } from '@/lib/calculations/finance'
import Sidebar from '@/components/ui/Sidebar'
import type { TradeCategory, TradeRate, Tradesperson } from '@/types'

export default function TradeRatesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [rates, setRates] = useState<TradeRate[]>([])
  const [tradespeople, setTradespeople] = useState<Tradesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [newTrade, setNewTrade] = useState({ name: '', category_id: '', phone: '', relationship: 'preferred_sub', priority: 2, notes: '' })

  useEffect(() => {
    const load = async () => {
      const [catRes, rateRes, tradeRes] = await Promise.all([
        supabase.from('trade_categories').select('*').order('sort_order'),
        supabase.from('trade_rates').select('*, trade_categories(name), tradespeople(name, relationship)'),
        supabase.from('tradespeople').select('*, trade_categories(name)').eq('is_active', true).order('priority'),
      ])
      setCategories(catRes.data ?? [])
      setRates(rateRes.data ?? [])
      setTradespeople(tradeRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredRates = rates.filter(r => {
    const matchesCat = selectedCat === 'all' || r.category_id === selectedCat
    const matchesSearch = !search || r.item_name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const addTradesperson = async () => {
    if (!newTrade.name || !newTrade.category_id) return
    await supabase.from('tradespeople').insert({ ...newTrade, is_active: true, typically_available: true, lead_time_days: 0 })
    setShowAddTrade(false)
    setNewTrade({ name: '', category_id: '', phone: '', relationship: 'preferred_sub', priority: 2, notes: '' })
    const { data } = await supabase.from('tradespeople').select('*, trade_categories(name)').eq('is_active', true).order('priority')
    setTradespeople(data ?? [])
  }

  const relColor = (r: string) => {
    if (r === 'family') return { bg: '#dcfce7', color: '#166534' }
    if (r === 'mate') return { bg: '#dbeafe', color: '#1e40af' }
    if (r === 'trusted_sub') return { bg: '#fef9c3', color: '#713f12' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Trade rates</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Your full rates book — team, trusted subs, and 2026 NSW market rates</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAddTrade(true)}>+ Add tradesperson</button>
        </div>

        {/* Your team */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Your team (first call)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {tradespeople.filter(t => ['family', 'mate'].includes(t.relationship)).map(t => {
              const rc = relColor(t.relationship)
              const cat = (t as any).trade_categories?.name ?? ''
              return (
                <div key={t.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: rc.bg, color: rc.color }}>
                      {t.relationship}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{cat}</div>
                  {t.phone && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{t.phone}</div>}
                  {t.rating && (
                    <div style={{ fontSize: 12, color: '#d4a843', marginTop: 4 }}>
                      {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                    </div>
                  )}
                  {t.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                </div>
              )
            })}
          </div>

          {tradespeople.filter(t => !['family', 'mate'].includes(t.relationship)).length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, margin: '16px 0 10px', color: '#555' }}>Backup trades</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {tradespeople.filter(t => !['family', 'mate'].includes(t.relationship)).map(t => {
                  const rc = relColor(t.relationship)
                  return (
                    <div key={t.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: rc.bg, color: rc.color }}>
                          {t.relationship.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>{(t as any).trade_categories?.name}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Add trade modal */}
        {showAddTrade && (
          <div className="card" style={{ marginBottom: 16, border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add tradesperson</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input style={inputStyle} value={newTrade.name} onChange={e => setNewTrade(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Trade category *</label>
                <select style={inputStyle} value={newTrade.category_id} onChange={e => setNewTrade(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Select</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={newTrade.phone} onChange={e => setNewTrade(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Relationship</label>
                <select style={inputStyle} value={newTrade.relationship} onChange={e => setNewTrade(p => ({ ...p, relationship: e.target.value }))}>
                  {['family', 'mate', 'trusted_sub', 'preferred_sub', 'backup', 'one_off'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority (1=first call)</label>
                <input type="number" min="1" max="5" style={inputStyle} value={newTrade.priority} onChange={e => setNewTrade(p => ({ ...p, priority: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} value={newTrade.notes} onChange={e => setNewTrade(p => ({ ...p, notes: e.target.value }))} placeholder="Specialty, discount, etc." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={addTradesperson}>Save tradesperson</button>
              <button className="btn-outline" onClick={() => setShowAddTrade(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Rates table */}
        <div className="card">
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              style={{ ...inputStyle, width: 240 }}
              placeholder="Search rates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{ ...inputStyle, width: 220 }} value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>
              {filteredRates.length} items
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading rates...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Low</th>
                  <th>Mid (typical)</th>
                  <th>High</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, color: '#888' }}>{(r as any).trade_categories?.name}</td>
                    <td style={{ fontWeight: 500 }}>{r.item_name}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>per {r.unit}</td>
                    <td style={{ color: '#166534' }}>{fmtCurrency(r.rate_low)}</td>
                    <td style={{ fontWeight: 600, color: '#1a1a1a' }}>{fmtCurrency(r.rate_mid)}</td>
                    <td style={{ color: '#991b1b' }}>{fmtCurrency(r.rate_high)}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
          All rates are 2026 NSW market rates (supply & install unless noted). Your family/mate rates are typically 15–25% below mid. China-sourced materials reduce materials component by ~30–40%.
        </div>
      </main>
    </div>
  )
}
