'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcChineseFreight, fmtCurrency } from '@/lib/calculations/finance'
import Sidebar from '@/components/ui/Sidebar'

export default function SourcingPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    product_name: '', category: '', url: '', unit_price_aud: '', au_trade_price_aud: '',
    weight_kg: '', volume_cbm: '', customs_duty_pct: '5', quality_tier: 'mid',
    lead_time_days: '60', notes: '', moq: '1', unit: 'item'
  })
  const [freight, setFreight] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('sourcing_products').select('*').eq('is_active', true).order('created_at', { ascending: false })
      setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const calcFreight = () => {
    if (!form.unit_price_aud || !form.au_trade_price_aud) return
    const result = calcChineseFreight(
      Number(form.unit_price_aud),
      Number(form.weight_kg) || 10,
      Number(form.volume_cbm) || 0.1,
      Number(form.au_trade_price_aud),
      Number(form.customs_duty_pct) || 5
    )
    setFreight(result)
  }

  const saveProduct = async () => {
    if (!form.product_name) return
    const landed = freight?.totalLandedCostAUD ?? Number(form.unit_price_aud)
    const au = Number(form.au_trade_price_aud)
    const saving = au - landed
    const savingPct = au > 0 ? Math.round((saving / au) * 100) : 0

    await supabase.from('sourcing_products').insert({
      product_name: form.product_name,
      url: form.url,
      unit_price_aud: Number(form.unit_price_aud),
      au_trade_price_aud: au,
      au_retail_price_aud: au * 1.3,
      landed_cost_aud: landed,
      freight_cost_aud: freight?.seaFreightAUD,
      customs_duty_aud: freight?.customsDutyAUD,
      customs_duty_pct: Number(form.customs_duty_pct),
      saving_pct: savingPct,
      weight_kg: Number(form.weight_kg),
      volume_cbm: Number(form.volume_cbm),
      quality_tier: form.quality_tier,
      lead_time_days: Number(form.lead_time_days),
      notes: form.notes,
      moq: Number(form.moq),
      unit: form.unit,
      is_active: true,
    })

    const { data } = await supabase.from('sourcing_products').select('*').eq('is_active', true).order('created_at', { ascending: false })
    setProducts(data ?? [])
    setShowAdd(false)
    setForm({ product_name: '', category: '', url: '', unit_price_aud: '', au_trade_price_aud: '', weight_kg: '', volume_cbm: '', customs_duty_pct: '5', quality_tier: 'mid', lead_time_days: '60', notes: '', moq: '1', unit: 'item' })
    setFreight(null)
  }

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }

  const tierColor = (t: string) => {
    if (t === 'premium' || t === 'luxury') return { bg: '#fef9c3', color: '#713f12' }
    if (t === 'mid') return { bg: '#eff6ff', color: '#1e40af' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>China sourcing hub</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Save products, calculate landed cost vs AU trade price, track your savings</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add product</button>
        </div>

        {/* Add product form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 20, border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add sourced product</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Product name *</label>
              <input style={inputStyle} value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. 600x1200 Porcelain tiles (matt finish)" />
            </div>
            <div style={{ ...grid2, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Alibaba/1688 URL</label>
                <input style={inputStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Paste product URL" />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <select style={inputStyle} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['item', 'sqm', 'lm', 'set', 'box', 'pallet', 'container'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{ ...grid3, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>China price (AUD) *</label>
                <input type="number" style={inputStyle} value={form.unit_price_aud} onChange={e => setForm(f => ({ ...f, unit_price_aud: e.target.value }))} placeholder="e.g. 8.50" />
              </div>
              <div>
                <label style={labelStyle}>AU trade price (AUD) *</label>
                <input type="number" style={inputStyle} value={form.au_trade_price_aud} onChange={e => setForm(f => ({ ...f, au_trade_price_aud: e.target.value }))} placeholder="e.g. 45.00" />
              </div>
              <div>
                <label style={labelStyle}>MOQ</label>
                <input type="number" style={inputStyle} value={form.moq} onChange={e => setForm(f => ({ ...f, moq: e.target.value }))} />
              </div>
            </div>
            <div style={{ ...grid3, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Weight per unit (kg)</label>
                <input type="number" style={inputStyle} value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} placeholder="e.g. 2.5" />
              </div>
              <div>
                <label style={labelStyle}>Volume per unit (CBM)</label>
                <input type="number" step="0.001" style={inputStyle} value={form.volume_cbm} onChange={e => setForm(f => ({ ...f, volume_cbm: e.target.value }))} placeholder="e.g. 0.003" />
              </div>
              <div>
                <label style={labelStyle}>Customs duty (%)</label>
                <input type="number" style={inputStyle} value={form.customs_duty_pct} onChange={e => setForm(f => ({ ...f, customs_duty_pct: e.target.value }))} />
              </div>
            </div>
            <div style={{ ...grid2, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Quality tier</label>
                <select style={inputStyle} value={form.quality_tier} onChange={e => setForm(f => ({ ...f, quality_tier: e.target.value }))}>
                  {['budget', 'mid', 'premium', 'luxury'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lead time (days)</label>
                <input type="number" style={inputStyle} value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Quality notes, supplier name, warehouse location..." />
            </div>

            <button className="btn-outline" onClick={calcFreight} style={{ marginBottom: 12 }}>Calculate freight →</button>

            {freight && (
              <div className="highlight-box" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 10 }}>Freight calculation</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Sea freight', value: fmtCurrency(freight.seaFreightAUD) },
                    { label: 'Customs duty', value: fmtCurrency(freight.customsDutyAUD) },
                    { label: 'Local delivery', value: fmtCurrency(freight.localDeliveryAUD) },
                    { label: 'Landed cost', value: fmtCurrency(freight.totalLandedCostAUD) },
                    { label: 'AU trade price', value: fmtCurrency(freight.auTradePriceAUD) },
                    { label: 'You save', value: `${fmtCurrency(freight.savingAUD)} (${freight.savingPct}%)`, color: freight.savingAUD > 0 ? '#86efac' : '#fca5a5' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value" style={{ fontSize: 16, color: (m as any).color ?? '#d4a843' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveProduct}>Save product</button>
              <button className="btn-outline" onClick={() => { setShowAdd(false); setFreight(null) }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Products list */}
        {loading ? (
          <div style={{ color: '#888' }}>Loading...</div>
        ) : products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            No products saved yet — add your first China sourced product
          </div>
        ) : (
          <div>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="metric-card">
                <div className="metric-label">Products saved</div>
                <div className="metric-value">{products.length}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Avg saving</div>
                <div className="metric-value">{Math.round(products.reduce((s, p) => s + (p.saving_pct ?? 0), 0) / products.length)}%</div>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>China price</th>
                  <th>Landed cost</th>
                  <th>AU trade price</th>
                  <th>Saving</th>
                  <th>Quality</th>
                  <th>Lead time</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const tc = tierColor(p.quality_tier)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#d4a843' }}>View listing →</a>}
                        {p.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.notes}</div>}
                      </td>
                      <td>{fmtCurrency(p.unit_price_aud ?? 0)}<span style={{ fontSize: 11, color: '#888' }}>/{p.unit}</span></td>
                      <td>{fmtCurrency(p.landed_cost_aud ?? 0)}</td>
                      <td>{fmtCurrency(p.au_trade_price_aud ?? 0)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#166534', fontSize: 15 }}>{p.saving_pct}%</div>
                        <div style={{ fontSize: 12, color: '#166534' }}>{fmtCurrency((p.au_trade_price_aud ?? 0) - (p.landed_cost_aud ?? 0))} saved</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.color }}>
                          {p.quality_tier}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#555' }}>{p.lead_time_days} days</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
