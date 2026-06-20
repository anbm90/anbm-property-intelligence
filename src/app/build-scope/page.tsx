'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCurrency } from '@/lib/calculations/finance'
import Sidebar from '@/components/ui/Sidebar'
import type { Property, TradeCategory, TradeRate, Tradesperson } from '@/types'

interface LineItem {
  id?: string
  category_id: string
  tradesperson_id?: string
  item_name: string
  unit: string
  quantity: number
  rate: number
  rate_low?: number
  rate_mid?: number
  rate_high?: number
  notes?: string
  sourcing: string
}

export default function BuildScopePage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [rates, setRates] = useState<TradeRate[]>([])
  const [tradespeople, setTradespeople] = useState<Tradesperson[]>([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [scopeName, setScopeName] = useState('Main Scope')
  const [scenario, setScenario] = useState('base')
  const [lines, setLines] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [savedScopes, setSavedScopes] = useState<any[]>([])
  const [activeScope, setActiveScope] = useState<string | null>(null)

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
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedProperty) return
    const loadScopes = async () => {
      const { data } = await supabase.from('build_scopes').select('*, scope_line_items(*)').eq('property_id', selectedProperty).eq('is_active', true)
      setSavedScopes(data ?? [])
    }
    loadScopes()
  }, [selectedProperty])

  const addLine = () => {
    setLines(l => [...l, {
      category_id: categories[0]?.id ?? '',
      item_name: '',
      unit: 'item',
      quantity: 1,
      rate: 0,
      sourcing: 'trade_supply',
    }])
  }

  const updateLine = (i: number, key: string, val: any) => {
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [key]: val } : line))
  }

  const removeLine = (i: number) => {
    setLines(l => l.filter((_, idx) => idx !== i))
  }

  const addFromRate = (rate: TradeRate) => {
    // Find first available tradesperson for this category
    const tp = tradespeople.find(t => t.category_id === rate.category_id && ['family', 'mate'].includes(t.relationship))
      ?? tradespeople.find(t => t.category_id === rate.category_id)

    setLines(l => [...l, {
      category_id: rate.category_id,
      tradesperson_id: tp?.id,
      item_name: rate.item_name,
      unit: rate.unit,
      quantity: 1,
      rate: rate.rate_mid,
      rate_low: rate.rate_low,
      rate_mid: rate.rate_mid,
      rate_high: rate.rate_high,
      notes: rate.notes ?? '',
      sourcing: 'trade_supply',
    }])
  }

  const totalCost = lines.reduce((sum, l) => sum + (l.quantity * l.rate), 0)
  const lowCost = lines.reduce((sum, l) => sum + (l.quantity * (l.rate_low ?? l.rate)), 0)
  const highCost = lines.reduce((sum, l) => sum + (l.quantity * (l.rate_high ?? l.rate)), 0)

  const saveScope = async () => {
    if (!selectedProperty || lines.length === 0) return
    setSaving(true)
    const { data: scope } = await supabase.from('build_scopes').insert({
      property_id: selectedProperty,
      name: scopeName,
      scenario,
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
          quantity: l.quantity,
          rate: l.rate,
          rate_low: l.rate_low,
          rate_mid: l.rate_mid,
          rate_high: l.rate_high,
          sourcing: l.sourcing,
          materials_cost: 0,
          labour_cost: l.quantity * l.rate,
          duration_weeks: 1,
          trade_sequence: i + 1,
          notes: l.notes,
          is_locked: false,
        }))
      )
      // Update property build cost
      await supabase.from('properties').update({ notes: `Build scope saved: ${fmtCurrency(totalCost)}` }).eq('id', selectedProperty)
      const { data } = await supabase.from('build_scopes').select('*, scope_line_items(*)').eq('property_id', selectedProperty).eq('is_active', true)
      setSavedScopes(data ?? [])
      setActiveScope(scope.id)
    }
    setSaving(false)
    alert('Scope saved!')
  }

  const inputStyle = { width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700 as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }

  const filteredRates = rates.filter(r => filterCat === 'all' || r.category_id === filterCat)

  const getTradeForCategory = (catId: string) => {
    return tradespeople.filter(t => t.category_id === catId)
  }

  const tradespersonLabel = (id?: string) => {
    const t = tradespeople.find(x => x.id === id)
    return t ? `${t.name} (${t.relationship})` : 'Market rate'
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Build scope</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Build a full line-item scope of works for any property</p>
        </div>

        {/* Property + scope settings */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Property</label>
              <select style={inputStyle} value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
                {properties.map(p => <option key={p.id} value={p.id}>{(p as any).nickname} — {(p as any).suburb}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Scope name</label>
              <input style={inputStyle} value={scopeName} onChange={e => setScopeName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Scenario</label>
              <select style={inputStyle} value={scenario} onChange={e => setScenario(e.target.value)}>
                <option value="conservative">Conservative</option>
                <option value="base">Base</option>
                <option value="optimistic">Optimistic</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          {/* Rate picker */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Rate library</div>
              <div style={{ marginBottom: 10 }}>
                <select style={inputStyle} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {filteredRates.map(r => (
                <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => addFromRate(r)}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{r.item_name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {fmtCurrency(r.rate_low)}–{fmtCurrency(r.rate_high)} / {r.unit}
                  </div>
                  <div style={{ fontSize: 10, color: '#d4a843', marginTop: 2 }}>+ Click to add</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scope lines */}
          <div>
            {/* Totals */}
            {lines.length > 0 && (
              <div className="highlight-box" style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="metric-label">Low estimate</div>
                    <div className="metric-value">{fmtCurrency(lowCost)}</div>
                  </div>
                  <div>
                    <div className="metric-label">Base estimate</div>
                    <div className="metric-value">{fmtCurrency(totalCost)}</div>
                  </div>
                  <div>
                    <div className="metric-label">High estimate</div>
                    <div className="metric-value">{fmtCurrency(highCost)}</div>
                  </div>
                  <div>
                    <div className="metric-label">Line items</div>
                    <div className="metric-value">{lines.length}</div>
                  </div>
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No items yet</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Click any rate from the library on the left, or add a custom line</div>
                <button className="btn-primary" onClick={addLine}>+ Add custom line</button>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Scope items</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" style={{ fontSize: 12 }} onClick={addLine}>+ Custom line</button>
                    <button className="btn-primary" onClick={saveScope} disabled={saving}>{saving ? 'Saving...' : 'Save scope'}</button>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Who</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 60 }}>Qty</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 50 }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 90 }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#888', fontWeight: 600, width: 90 }}>Total</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '6px' }}>
                          <input
                            style={{ ...inputStyle, width: '100%' }}
                            value={line.item_name}
                            onChange={e => updateLine(i, 'item_name', e.target.value)}
                            placeholder="Item description"
                          />
                          {line.rate_low && (
                            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                              Range: {fmtCurrency(line.rate_low)}–{fmtCurrency(line.rate_high ?? line.rate)} per {line.unit}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            style={{ ...inputStyle, fontSize: 12 }}
                            value={line.tradesperson_id ?? ''}
                            onChange={e => updateLine(i, 'tradesperson_id', e.target.value)}
                          >
                            <option value="">Market rate</option>
                            {tradespeople.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.relationship})</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, textAlign: 'center' }}
                            value={line.quantity}
                            onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select style={{ ...inputStyle, fontSize: 12 }} value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)}>
                            {['hr', 'day', 'sqm', 'lm', 'item', 'fixed', 'm3'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, textAlign: 'right' }}
                            value={line.rate}
                            onChange={e => updateLine(i, 'rate', Number(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                          {fmtCurrency(line.quantity * line.rate)}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <button
                            onClick={() => removeLine(i)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
                          >×</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '10px 6px', fontSize: 14, textAlign: 'right' }}>TOTAL</td>
                      <td style={{ padding: '10px 6px', fontSize: 16, fontWeight: 800, color: '#1a1a2e', textAlign: 'right' }}>{fmtCurrency(totalCost)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Saved scopes */}
            {savedScopes.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Saved scopes</div>
                {savedScopes.map(scope => {
                  const items = scope.scope_line_items ?? []
                  const total = items.reduce((s: number, i: any) => s + (i.quantity * i.rate), 0)
                  return (
                    <div key={scope.id} style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{scope.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{scope.scenario} · {items.length} items</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{fmtCurrency(total)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
