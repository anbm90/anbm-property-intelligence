'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function BuildScopePage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rates, setRates] = useState<any[]>([])
  const [tradespeople, setTradespeople] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [lines, setLines] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [propRes, catRes, rateRes, tradeRes] = await Promise.all([
        supabase.from('properties').select('id, nickname, suburb').neq('status', 'archived').order('composite_score', { ascending: false }),
        supabase.from('trade_categories').select('*').order('sort_order'),
        supabase.from('trade_rates').select('*, trade_categories(name)'),
        supabase.from('tradespeople').select('*, trade_categories(name)').eq('is_active', true).order('priority'),
      ])
      setProperties(propRes.data ?? [])
      setCategories(catRes.data ?? [])
      setRates(rateRes.data ?? [])
      setTradespeople(tradeRes.data ?? [])
      if (propRes.data?.[0]) setSelectedProperty(propRes.data[0].id)
    }
    load()
  }, [])

  const addFromRate = (rate: any) => {
    const tp = tradespeople.find(t => t.category_id === rate.category_id && ['family','mate'].includes(t.relationship))
      ?? tradespeople.find(t => t.category_id === rate.category_id)
    setLines(l => [...l, {
      id: Date.now(),
      category_id: rate.category_id,
      category_name: rate.trade_categories?.name,
      tradesperson_id: tp?.id ?? '',
      tradesperson_name: tp?.name ?? 'Market rate',
      item_name: rate.item_name,
      unit: rate.unit,
      quantity: 1,
      rate: rate.rate_mid,
      rate_low: rate.rate_low,
      rate_high: rate.rate_high,
      notes: rate.notes ?? '',
    }])
  }

  const addCustomLine = () => {
    setLines(l => [...l, {
      id: Date.now(),
      category_id: '',
      category_name: '',
      tradesperson_id: '',
      tradesperson_name: 'Market rate',
      item_name: '',
      unit: 'item',
      quantity: 1,
      rate: 0,
      rate_low: 0,
      rate_high: 0,
      notes: '',
    }])
  }

  const updateLine = (id: number, key: string, val: any) => {
    setLines(l => l.map(line => line.id === id ? { ...line, [key]: val } : line))
  }

  const removeLine = (id: number) => setLines(l => l.filter(line => line.id !== id))

  const total = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.rate)), 0)
  const lowTotal = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.rate_low || l.rate)), 0)
  const highTotal = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.rate_high || l.rate)), 0)

  const saveScope = async () => {
    if (!selectedProperty || !lines.length) return
    setSaving(true)
    const { data: scope } = await supabase.from('build_scopes').insert({
      property_id: selectedProperty,
      name: 'Main Scope',
      scenario: 'base',
      is_active: true,
    }).select().single()

    if (scope) {
      await supabase.from('scope_line_items').insert(
        lines.map((l, i) => ({
          scope_id: scope.id,
          category_id: l.category_id || null,
          tradesperson_id: l.tradesperson_id || null,
          item_name: l.item_name,
          unit: l.unit,
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          rate_low: Number(l.rate_low),
          rate_mid: Number(l.rate),
          rate_high: Number(l.rate_high),
          sourcing: 'trade_supply',
          materials_cost: 0,
          labour_cost: Number(l.quantity) * Number(l.rate),
          duration_weeks: 1,
          trade_sequence: i + 1,
          notes: l.notes,
          is_locked: false,
        }))
      )
      alert('Scope saved!')
    }
    setSaving(false)
  }

  const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString()
  const filteredRates = rates.filter(r => filterCat === 'all' || r.category_id === filterCat)

  const inp: any = { className: 'form-input', style: { fontSize: 13, padding: '6px 8px' } }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Build scope</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Build a line-item scope of works — click rates from the library to add</p>
        </div>

        {/* Property selector */}
        <div className="card">
          <label className="form-label">Property</label>
          <select className="form-input" style={{ maxWidth: 400 }} value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.nickname} — {p.suburb}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Rate library */}
          <div className="card" style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Rate library</div>
            <select className="form-input" style={{ marginBottom: 10, fontSize: 13 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filteredRates.map(r => (
              <div key={r.id} onClick={() => addFromRate(r)} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{r.item_name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>${r.rate_low}–${r.rate_high} / {r.unit}</div>
                <div style={{ fontSize: 10, color: '#d4a843', marginTop: 2 }}>+ Click to add</div>
              </div>
            ))}
          </div>

          {/* Scope */}
          <div>
            {lines.length > 0 && (
              <div className="highlight-box">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div><div className="metric-label">Low</div><div className="metric-value">{fmtMoney(lowTotal)}</div></div>
                  <div><div className="metric-label">Base</div><div className="metric-value">{fmtMoney(total)}</div></div>
                  <div><div className="metric-label">High</div><div className="metric-value">{fmtMoney(highTotal)}</div></div>
                  <div><div className="metric-label">Items</div><div className="metric-value">{lines.length}</div></div>
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No items yet</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Click any rate from the library on the left</div>
                <button className="btn-primary" onClick={addCustomLine}>+ Add custom line</button>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Scope items</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" style={{ fontSize: 12 }} onClick={addCustomLine}>+ Custom</button>
                    <button className="btn-primary" onClick={saveScope} disabled={saving}>{saving ? 'Saving...' : 'Save scope'}</button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600 }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600 }}>Who</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 60 }}>Qty</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 50 }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 90 }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 90 }}>Total</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => (
                      <tr key={line.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '6px' }}>
                          <input {...inp} style={{ ...inp.style, width: '100%' }} value={line.item_name} onChange={e => updateLine(line.id, 'item_name', e.target.value)} placeholder="Item description" />
                          {line.rate_low > 0 && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Range: ${line.rate_low}–${line.rate_high} / {line.unit}</div>}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select {...inp} value={line.tradesperson_id} onChange={e => updateLine(line.id, 'tradesperson_id', e.target.value)}>
                            <option value="">Market rate</option>
                            {tradespeople.map(t => <option key={t.id} value={t.id}>{t.name} ({t.relationship})</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input {...inp} type="number" style={{ ...inp.style, textAlign: 'center' }} value={line.quantity} onChange={e => updateLine(line.id, 'quantity', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select {...inp} value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)}>
                            {['hr','day','sqm','lm','item','fixed','m3'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input {...inp} type="number" style={{ ...inp.style, textAlign: 'right' }} value={line.rate} onChange={e => updateLine(line.id, 'rate', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>
                          {fmtMoney(Number(line.quantity) * Number(line.rate))}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <button onClick={() => removeLine(line.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '10px 6px', textAlign: 'right', fontSize: 14 }}>TOTAL</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>{fmtMoney(total)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}